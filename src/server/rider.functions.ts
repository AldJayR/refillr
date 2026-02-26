import { createServerFn } from '@tanstack/react-start'
import { connectToDatabase } from '@/lib/db.server'
import { OrderModel } from '@/models/Order.server'
import { GetPendingOrdersSchema, AcceptOrderSchema, CreateRiderSchema, objectIdRegex } from '@/lib/schemas'
import { requireAuthMiddleware } from './middleware'
import { z } from 'zod'
import { RiderModel } from '@/models/Rider.server'
import { UserModel } from '@/models/User.server'

/**
 * Get the current user's rider profile.
 * Returns null if the user hasn't registered as a rider yet.
 */
export const getMyRider = createServerFn({ method: 'GET' })
    .middleware([requireAuthMiddleware])
    .handler(async ({ context }) => {
        await connectToDatabase()

        const rider = await RiderModel.findOne({ userId: context.userId }).lean()

        if (!rider) return null

        return {
            ...rider,
            _id: rider._id.toString(),
        }
    })

/**
 * Register a new rider profile and update user role to 'rider'.
 */
export const createRider = createServerFn({ method: 'POST' })
    .inputValidator(CreateRiderSchema)
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        await connectToDatabase()

        const existing = await RiderModel.findOne({ userId: context.userId })
        if (existing) {
            return { success: false as const, error: 'You already have a rider profile' }
        }

        const rider = await RiderModel.create({
            ...data,
            userId: context.userId,
        })

        // Update user role to 'rider'
        await UserModel.findOneAndUpdate(
            { clerkId: context.userId },
            { $set: { role: 'rider' } }
        )

        return rider._id.toString()
    })

/**
 * Update a rider's online status.
 */
export const updateRiderStatus = createServerFn({ method: 'POST' })
    .inputValidator(z.object({ isOnline: z.boolean() }))
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        await connectToDatabase()

        const isRider = await RiderModel.exists({ userId: context.userId })
        if (!isRider) return false

        const rider = await RiderModel.findOneAndUpdate(
            { userId: context.userId },
            { $set: { isOnline: data.isOnline } },
            { new: true }
        )

        return rider !== null
    })

/**
 * Update a rider's current location.
 */
export const updateRiderLocation = createServerFn({ method: 'POST' })
    .inputValidator(z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
    }))
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        await connectToDatabase()

        const isRider = await RiderModel.exists({ userId: context.userId })
        if (!isRider) return false

        const rider = await RiderModel.findOneAndUpdate(
            { userId: context.userId },
            {
                $set: {
                    lastLocation: {
                        type: 'Point',
                        coordinates: [data.longitude, data.latitude],
                    },
                },
            },
            { new: true }
        )

        return rider !== null
    })

/**
 * Get online riders near a location.
 * Public endpoint — no auth required; rider locations are public map data.
 */
export const getNearbyRiders = createServerFn({ method: 'GET' })
    .inputValidator(z.object({ 
        latitude: z.number().min(-90).max(90), 
        longitude: z.number().min(-180).max(180),
        radiusMeters: z.number().int().positive().max(50000).default(5000)
    }))
    .handler(async ({ data }) => {
        await connectToDatabase()

        const riders = await RiderModel.find({
            isOnline: true,
            lastLocation: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [data.longitude, data.latitude]
                    },
                    $maxDistance: data.radiusMeters
                }
            }
        })
        .select('_id firstName lastLocation isOnline')
        .lean()

        return riders.map(rider => ({
            ...rider,
            _id: rider._id.toString(),
        }))
    })

/**
 * Get pending orders near a rider's location.
 */
export const getPendingOrdersNearby = createServerFn({ method: 'GET' })
    .inputValidator(GetPendingOrdersSchema)
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        await connectToDatabase()

        const isRider = await RiderModel.exists({ userId: context.userId })
        if (!isRider) return []

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

        // Verify the caller has a registered rider profile
        const riderProfile = await RiderModel.exists({ userId: context.userId })
        if (!riderProfile) return { success: false, error: 'You must register as a rider first' }

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
    .inputValidator(z.string().regex(objectIdRegex, 'Invalid order ID format'))
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
    .inputValidator(z.string().regex(objectIdRegex, 'Invalid order ID format'))
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
