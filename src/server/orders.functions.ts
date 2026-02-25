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

const validator = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T | undefined => {
    const result = schema.safeParse(data)
    if (!result.success) return undefined
    return result.data
  }
}

export const createRefillRequest = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const parsed = validator(CreateOrderSchema)(data)
    if (!parsed) return null
    await connectToDatabase()

    const order = await OrderModel.create({
      ...parsed,
      merchantId: new Types.ObjectId(parsed.merchantId),
      status: 'pending',
    })

    return order._id.toString()
  })

export const getUserOrders = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const userId = data as string | undefined
    if (!userId) return []

    await connectToDatabase()

    const orders = await OrderModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return orders.map(order => ({
      ...order,
      _id: (order._id as Types.ObjectId).toString(),
      merchantId: (order.merchantId as Types.ObjectId).toString(),
      riderId: order.riderId ? (order.riderId as Types.ObjectId).toString() : undefined
    }))
  })

export const getMerchantOrders = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const merchantId = data as string | undefined
    if (!merchantId) return []

    await connectToDatabase()

    const orders = await OrderModel.find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return orders.map(order => ({
      ...order,
      _id: (order._id as Types.ObjectId).toString(),
      merchantId: (order.merchantId as Types.ObjectId).toString(),
      riderId: order.riderId ? (order.riderId as Types.ObjectId).toString() : undefined
    }))
  })

export const cancelOrder = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const parsed = validator(CancelOrderSchema)(data)
    if (!parsed) return false
    await connectToDatabase()

    const order = await OrderModel.findById(parsed.orderId)
    if (!order) return false

    if (order.status !== 'pending') {
      return false
    }

    order.set('status', 'cancelled')
    order.set('cancellationReason', parsed.cancellationReason || 'Cancelled by user')
    order.set('cancelledAt', new Date())
    order.set('updatedAt', new Date())

    await order.save()
    return true
  })

export const updateOrderStatus = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const parsed = validator(UpdateOrderStatusSchema)(data)
    if (!parsed) return false
    await connectToDatabase()

    const updateFields: Record<string, unknown> = {
      status: parsed.status,
      updatedAt: new Date()
    }

    if (parsed.riderId) {
      updateFields.riderId = new Types.ObjectId(parsed.riderId)
    }

    switch (parsed.status) {
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
        updateFields.cancellationReason = parsed.cancellationReason
        break
    }

    const result = await OrderModel.findByIdAndUpdate(
      parsed.orderId,
      { $set: updateFields },
      { new: true }
    )

    return result !== null
  })

export const getOrderById = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const orderId = data as string | undefined
    if (!orderId) return null

    await connectToDatabase()

    const order = await OrderModel.findById(orderId).lean()

    if (!order) return null

    return {
      ...order,
      _id: (order._id as Types.ObjectId).toString(),
      merchantId: (order.merchantId as Types.ObjectId).toString(),
      riderId: order.riderId ? (order.riderId as Types.ObjectId).toString() : undefined
    }
  })
