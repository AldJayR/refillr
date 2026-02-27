import { connectToDatabase, withTransaction } from '@/lib/db.server'
import { OrderModel } from '@/models/Order.server'
import { RiderModel } from '@/models/Rider.server'
import { UserModel } from '@/models/User.server'

/**
 * Get the current user's rider profile.
 * Returns null if the user hasn't registered as a rider yet.
 */
export async function handleGetMyRider({ context }: { context: { userId: string } }) {
    try {
        await connectToDatabase()

        const rider = await RiderModel.findOne({ userId: context.userId }).lean()

        if (!rider) return null

        return {
            ...rider,
            _id: rider._id.toString(),
        }
    } catch (error) {
        console.error('[getMyRider]', error)
        throw new Error('Failed to fetch rider profile')
    }
}

/**
 * Register a new rider profile and update user role to 'rider'.
 * Uses a MongoDB transaction to ensure both the rider creation and
 * user role update succeed or fail together (cross-collection atomicity).
 */
export async function handleCreateRider({ data, context }: { data: any; context: { userId: string } }) {
    try {
        await connectToDatabase()

        const existing = await RiderModel.findOne({ userId: context.userId })
        if (existing) {
            return { success: false as const, error: 'You already have a rider profile' }
        }

        const riderId = await withTransaction(async (session) => {
            // Model.create() with a session requires an array
            const [rider] = await RiderModel.create([{
                ...data,
                userId: context.userId,
            }], { session })

            await UserModel.findOneAndUpdate(
                { clerkId: context.userId },
                { $set: { role: 'rider' } },
                { session }
            )

            return rider._id.toString()
        })

        return riderId
    } catch (error) {
        console.error('[createRider]', error)
        throw new Error('Failed to create rider profile')
    }
}

/**
 * Update a rider's online status.
 */
export async function handleUpdateRiderStatus({ data, context }: { data: { isOnline: boolean }; context: { userId: string } }) {
    try {
        await connectToDatabase()

        const isRider = await RiderModel.exists({ userId: context.userId })
        if (!isRider) return false

        const rider = await RiderModel.findOneAndUpdate(
            { userId: context.userId },
            { $set: { isOnline: data.isOnline } },
            { new: true }
        )

        return rider !== null
    } catch (error) {
        console.error('[updateRiderStatus]', error)
        throw new Error('Failed to update rider status')
    }
}

/**
 * Update a rider's current location.
 */
export async function handleUpdateRiderLocation({ data, context }: { data: { latitude: number; longitude: number }; context: { userId: string } }) {
    try {
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
    } catch (error) {
        console.error('[updateRiderLocation]', error)
        throw new Error('Failed to update rider location')
    }
}

/**
 * Get online riders near a location.
 * Public endpoint — no auth required; rider locations are public map data.
 */
export async function handleGetNearbyRiders({ data }: { data: { latitude: number; longitude: number; radiusMeters: number } }) {
    try {
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
    } catch (error) {
        console.error('[getNearbyRiders]', error)
        throw new Error('Failed to fetch nearby riders')
    }
}

/**
 * Get pending orders near a rider's location.
 */
export async function handleGetPendingOrdersNearby({ data, context }: { data: { latitude: number; longitude: number; radiusMeters: number }; context: { userId: string } }) {
    try {
        await connectToDatabase()

        const isRider = await RiderModel.exists({ userId: context.userId })
        if (!isRider) return []

        const orders = await OrderModel.find({
            status: 'pending',
            deliveryLocation: {
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
    } catch (error) {
        console.error('[getPendingOrdersNearby]', error)
        throw new Error('Failed to fetch nearby pending orders')
    }
}

/**
 * Accept an order as a rider.
 * Uses atomic findOneAndUpdate to prevent race conditions (double-accept).
 */
export async function handleAcceptOrder({ data, context }: { data: { orderId: string }; context: { userId: string } }) {
    try {
        await connectToDatabase()

        // Verify the caller has a registered rider profile
        const riderProfile = await RiderModel.exists({ userId: context.userId })
        if (!riderProfile) return { success: false, error: 'You must register as a rider first' }

        // Atomic check-and-set: only succeeds if status is still 'pending'
        // This eliminates the race condition where two riders accept simultaneously
        const order = await OrderModel.findOneAndUpdate(
            { _id: data.orderId, status: 'pending' },
            {
                $set: {
                    status: 'accepted',
                    riderId: context.userId,
                    acceptedAt: new Date(),
                    updatedAt: new Date(),
                },
            },
            { new: true }
        )

        if (!order) {
            // Either the order doesn't exist or it's no longer pending
            const exists = await OrderModel.exists({ _id: data.orderId })
            if (!exists) return { success: false, error: 'Order not found' }
            return { success: false, error: 'Order is no longer available' }
        }

        return {
            success: true,
            orderId: order._id.toString(),
        }
    } catch (error) {
        console.error('[acceptOrder]', error)
        throw new Error('Failed to accept order')
    }
}

/**
 * Mark an order as dispatched.
 * Uses atomic findOneAndUpdate with status + riderId preconditions.
 */
export async function handleMarkDispatched({ data: orderId, context }: { data: string; context: { userId: string } }) {
    try {
        await connectToDatabase()

        // Atomic: only succeeds if status is 'accepted' AND this rider owns it
        const order = await OrderModel.findOneAndUpdate(
            { _id: orderId, status: 'accepted', riderId: context.userId },
            {
                $set: {
                    status: 'dispatched',
                    dispatchedAt: new Date(),
                    updatedAt: new Date(),
                },
            },
            { new: true }
        )

        return order !== null
    } catch (error) {
        console.error('[markDispatched]', error)
        throw new Error('Failed to mark order as dispatched')
    }
}

/**
 * Mark an order as delivered.
 * Uses atomic findOneAndUpdate with status + riderId preconditions.
 */
export async function handleMarkDelivered({ data: orderId, context }: { data: string; context: { userId: string } }) {
    try {
        await connectToDatabase()

        // Atomic: only succeeds if status is 'dispatched' AND this rider owns it
        const order = await OrderModel.findOneAndUpdate(
            { _id: orderId, status: 'dispatched', riderId: context.userId },
            {
                $set: {
                    status: 'delivered',
                    deliveredAt: new Date(),
                    updatedAt: new Date(),
                },
            },
            { new: true }
        )

        return order !== null
    } catch (error) {
        console.error('[markDelivered]', error)
        throw new Error('Failed to mark order as delivered')
    }
}
