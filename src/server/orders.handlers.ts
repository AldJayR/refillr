import { connectToDatabase } from '@/lib/db.server'
import { OrderModel } from '@/models/Order.server'
import { MerchantModel } from '@/models/Merchant.server'
import { Types } from 'mongoose'
import { point, distance, booleanPointInPolygon, polygon as turfPolygon } from '@turf/turf'

export async function handleCreateRefillRequest({ data, context }: { data: any; context: { userId: string } }) {
  try {
    await connectToDatabase()

    // Look up the merchant to validate geofencing
    const merchant = await MerchantModel.findById(data.merchantId).lean()
    if (!merchant) {
      throw new Error('Merchant not found')
    }

    // Business logic validations
    if (!merchant.isOpen) {
      throw new Error('This merchant is currently closed')
    }

    if (!merchant.brandsAccepted?.includes(data.tankBrand)) {
      throw new Error(`This merchant does not carry ${data.tankBrand}`)
    }

    if (!merchant.tankSizes?.includes(data.tankSize)) {
      throw new Error(`This merchant does not carry ${data.tankSize} tanks`)
    }

    // Server-side price calculation — never trust client-supplied prices
    const pricingKey = `${data.tankBrand}-${data.tankSize}`
    const unitPrice = merchant.pricing?.[pricingKey]
    if (!unitPrice || unitPrice <= 0) {
      throw new Error('Pricing not configured for this item. Please contact the merchant.')
    }
    const totalPrice = unitPrice * data.quantity

    const deliveryPoint = point(data.deliveryLocation.coordinates)
    const merchantPoint = point(merchant.location.coordinates)

    // Check geofencing: polygon takes priority, then radius
    if (merchant.deliveryPolygon && merchant.deliveryPolygon.coordinates?.length > 0) {
      // Use Turf.js booleanPointInPolygon for polygon-based geofencing
      const poly = turfPolygon(merchant.deliveryPolygon.coordinates)
      const isInside = booleanPointInPolygon(deliveryPoint, poly)
      if (!isInside) {
        throw new Error('Delivery location is outside this merchant\'s service area')
      }
    } else {
      // Fall back to radius-based check
      const distKm = distance(deliveryPoint, merchantPoint, { units: 'kilometers' })
      const distMeters = distKm * 1000
      if (distMeters > merchant.deliveryRadiusMeters) {
        throw new Error(
          `Delivery location is ${(distKm).toFixed(1)}km away, but this merchant only delivers within ${(merchant.deliveryRadiusMeters / 1000).toFixed(1)}km`
        )
      }
    }

    const order = await OrderModel.create({
      ...data,
      userId: context.userId,
      merchantId: new Types.ObjectId(data.merchantId),
      status: 'pending',
      totalPrice,
    })

    return order._id.toString()
  } catch (error) {
    // Re-throw business logic errors (thrown explicitly above) as-is
    if (error instanceof Error && (
      error.message.startsWith('Merchant not found') ||
      error.message.startsWith('This merchant') ||
      error.message.startsWith('Pricing not configured') ||
      error.message.startsWith('Delivery location')
    )) {
      throw error
    }
    console.error('[createRefillRequest]', error)
    throw new Error('Failed to create refill request')
  }
}

export async function handleGetUserOrders({ context }: { context: { userId: string } }) {
  try {
    await connectToDatabase()

    const orders = await OrderModel.find({ userId: context.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return orders.map(order => ({
      ...order,
      _id: order._id.toString(),
      merchantId: order.merchantId.toString(),
      riderId: order.riderId,
    }))
  } catch (error) {
    console.error('[getUserOrders]', error)
    throw new Error('Failed to fetch user orders')
  }
}

export async function handleGetMerchantOrders({ data }: { data: { merchantId: string } }) {
  try {
    await connectToDatabase()

    const orders = await OrderModel.find({ merchantId: new Types.ObjectId(data.merchantId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return orders.map(order => ({
      ...order,
      _id: order._id.toString(),
      merchantId: order.merchantId.toString(),
      riderId: order.riderId,
    }))
  } catch (error) {
    console.error('[getMerchantOrders]', error)
    throw new Error('Failed to fetch merchant orders')
  }
}

/**
 * Cancel an order.
 * Uses atomic findOneAndUpdate with userId + status preconditions to prevent
 * race conditions and ensure only the order owner can cancel pending orders.
 */
export async function handleCancelOrder({ data, context }: { data: { orderId: string; cancellationReason?: string }; context: { userId: string } }) {
  try {
    await connectToDatabase()

    // Atomic: only cancels if the user owns the order AND it's still pending
    const order = await OrderModel.findOneAndUpdate(
      { _id: data.orderId, userId: context.userId, status: 'pending' },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: data.cancellationReason || 'Cancelled by user',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true }
    )

    return order !== null
  } catch (error) {
    console.error('[cancelOrder]', error)
    throw new Error('Failed to cancel order')
  }
}

export async function handleUpdateOrderStatus({ data, context }: { data: { orderId: string; status: string; riderId?: string; cancellationReason?: string }; context: { userId: string } }) {
  try {
    await connectToDatabase()

    // Authorization: order owner, assigned rider, or merchant owner
    const order = await OrderModel.findById(data.orderId)
    if (!order) return false

    const isOrderOwner = order.userId === context.userId
    const isAssignedRider = order.riderId === context.userId
    const merchantOwnerRecord = await MerchantModel.exists({
      _id: order.merchantId,
      ownerUserId: context.userId,
    })
    const isMerchantOwner = !!merchantOwnerRecord

    if (!isOrderOwner && !isAssignedRider && !isMerchantOwner) return false

    // RBAC: enforce who can perform each status transition
    if (data.status === 'cancelled') {
      // Customer may only cancel their own pending orders
      if (isOrderOwner && order.status !== 'pending') return false
      // Merchant and rider may cancel at any non-terminal state
      if (!isOrderOwner && !isMerchantOwner && !isAssignedRider) return false
    } else if (data.status === 'accepted') {
      if (!isMerchantOwner) return false
      if (order.status !== 'pending') return false
    } else if (['dispatched', 'in_transit', 'delivered'].includes(data.status)) {
      if (!isAssignedRider) return false
    } else {
      return false
    }

    const updateFields: Record<string, unknown> = {
      status: data.status,
      updatedAt: new Date()
    }

    if (data.riderId) {
      updateFields.riderId = data.riderId
    }

    switch (data.status) {
      case 'accepted':
        updateFields.acceptedAt = new Date()
        break
      case 'dispatched':
        updateFields.dispatchedAt = new Date()
        break
      case 'delivered':
        updateFields.deliveredAt = new Date()
        break
      case 'cancelled':
        updateFields.cancelledAt = new Date()
        updateFields.cancellationReason = data.cancellationReason
        break
    }

    // Use atomic findByIdAndUpdate with the current status as a precondition
    const result = await OrderModel.findOneAndUpdate(
      { _id: data.orderId, status: order.status },
      { $set: updateFields },
      { new: true }
    )

    return result !== null
  } catch (error) {
    console.error('[updateOrderStatus]', error)
    throw new Error('Failed to update order status')
  }
}

export async function handleGetOrderById({ data, context }: { data: { orderId: string }; context: { userId: string } }) {
  try {
    await connectToDatabase()

    const order = await OrderModel.findById(data.orderId).lean()

    if (!order) return null

    // Only allow the order owner, assigned rider, or merchant owner to view
    const isOwner = order.userId === context.userId
    const isRider = order.riderId === context.userId
    const merchantOwnerRecord = await MerchantModel.exists({
      _id: order.merchantId,
      ownerUserId: context.userId,
    })
    if (!isOwner && !isRider && !merchantOwnerRecord) {
      return null
    }

    return {
      ...order,
      _id: order._id.toString(),
      merchantId: order.merchantId.toString(),
      riderId: order.riderId,
    }
  } catch (error) {
    console.error('[getOrderById]', error)
    throw new Error('Failed to fetch order')
  }
}
