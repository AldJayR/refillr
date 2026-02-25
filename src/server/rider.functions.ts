import { createServerFn } from '@tanstack/react-start'
import { connectToDatabase } from '@/lib/db.server'
import { OrderModel } from '@/models/Order.server'
import { GetPendingOrdersSchema, AcceptOrderSchema } from '@/lib/schemas'
import { requireAuthMiddleware } from './middleware'
import { z } from 'zod'

/**
 * Get pending orders near a rider's location.
 */
export const getPendingOrdersNearby = createServerFn({ method: 'GET' })
    .inputValidator(GetPendingOrdersSchema)
    .middleware([requireAuthMiddleware])
    .handler(async ({ data }) => {
        await connectToDatabase()

        const orders = await OrderModel.find({
            status: 'pending',
            'deliveryLocation.coordinates': {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [data.longitude, data.latitude]
                    },
                    $maxDistance: data.radiusMeters
                }
            }
        })
            .sort({ createdAt: 1 })
            .limit(20)
            .lean()

        return orders.map(order => ({
            ...order,
            _id: order._id.toString(),
            merchantId: order.merchantId.toString(),
            riderId: order.riderId,
        }))
    })

/**
 * Accept an order as a rider.
 */
export const acceptOrder = createServerFn({ method: 'POST' })
    .inputValidator(AcceptOrderSchema)
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        await connectToDatabase()

        const order = await OrderModel.findById(data.orderId)
        if (!order) return { success: false, error: 'Order not found' }

        if (order.status !== 'pending') {
            return { success: false, error: 'Order is no longer available' }
        }

        order.set('status', 'accepted')
        order.set('riderId', context.userId)
        order.set('acceptedAt', new Date())
        order.set('updatedAt', new Date())
        await order.save()

        return {
            success: true,
            orderId: order._id.toString(),
        }
    })

/**
 * Mark an order as dispatched.
 */
export const markDispatched = createServerFn({ method: 'POST' })
    .inputValidator(z.string())
    .middleware([requireAuthMiddleware])
    .handler(async ({ data: orderId, context }) => {
        await connectToDatabase()

        const order = await OrderModel.findById(orderId)
        if (!order) return false

        // Security check
        if (order.riderId !== context.userId) return false

        if (order.status !== 'accepted') return false

        order.set('status', 'dispatched')
        order.set('dispatchedAt', new Date())
        order.set('updatedAt', new Date())
        await order.save()

        return true
    })

/**
 * Mark an order as delivered.
 */
export const markDelivered = createServerFn({ method: 'POST' })
    .inputValidator(z.string())
    .middleware([requireAuthMiddleware])
    .handler(async ({ data: orderId, context }) => {
        await connectToDatabase()

        const order = await OrderModel.findById(orderId)
        if (!order) return false

        // Security check
        if (order.riderId !== context.userId) return false

        if (order.status !== 'dispatched') return false

        order.set('status', 'delivered')
        order.set('deliveredAt', new Date())
        order.set('updatedAt', new Date())
        await order.save()

        return true
    })
