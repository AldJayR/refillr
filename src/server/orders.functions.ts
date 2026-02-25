import { createServerFn } from '@tanstack/react-start'
import { connectToDatabase } from '@/lib/db.server'
import { OrderModel } from '@/models/Order.server'
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  CancelOrderSchema
} from '@/lib/schemas'
import { Types } from 'mongoose'
import { z } from 'zod'
import { requireAuthMiddleware } from './middleware'

export const createRefillRequest = createServerFn({ method: 'POST' })
  .inputValidator(CreateOrderSchema)
  .middleware([requireAuthMiddleware])
  .handler(async ({ data, context }) => {
    await connectToDatabase()

    const order = await OrderModel.create({
      ...data,
      userId: context.userId,
      merchantId: new Types.ObjectId(data.merchantId),
      status: 'pending',
    })

    return order._id.toString()
  })

export const getUserOrders = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
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
  })

export const getMerchantOrders = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ merchantId: z.string() }))
  .middleware([requireAuthMiddleware])
  .handler(async ({ data }) => {
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
  })

export const cancelOrder = createServerFn({ method: 'POST' })
  .inputValidator(CancelOrderSchema)
  .middleware([requireAuthMiddleware])
  .handler(async ({ data, context }) => {
    await connectToDatabase()

    const order = await OrderModel.findById(data.orderId)
    if (!order) return false

    // Security check: ensure the user owns the order
    if (order.userId !== context.userId) {
      return false
    }

    if (order.status !== 'pending') {
      return false
    }

    order.set('status', 'cancelled')
    order.set('cancellationReason', data.cancellationReason || 'Cancelled by user')
    order.set('cancelledAt', new Date())
    order.set('updatedAt', new Date())

    await order.save()
    return true
  })

export const updateOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator(UpdateOrderStatusSchema)
  .middleware([requireAuthMiddleware])
  .handler(async ({ data }) => {
    await connectToDatabase()

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

    const result = await OrderModel.findByIdAndUpdate(
      data.orderId,
      { $set: updateFields },
      { new: true }
    )

    return result !== null
  })

export const getOrderById = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    await connectToDatabase()

    const order = await OrderModel.findById(data.orderId).lean()

    if (!order) return null

    return {
      ...order,
      _id: order._id.toString(),
      merchantId: order.merchantId.toString(),
      riderId: order.riderId,
    }
  })
