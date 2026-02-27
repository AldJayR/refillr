import { vi } from 'vitest'
import mongoose from 'mongoose'
import { connectTestDb, cleanTestDb, disconnectTestDb } from './helpers/db-setup'
import { createTestRider, createTestUser, createTestOrder } from './helpers/seed'
import { RiderModel } from '@/models/Rider.server'
import { UserModel } from '@/models/User.server'
import { OrderModel } from '@/models/Order.server'
import { Types } from 'mongoose'

// Mock connectToDatabase to be a no-op — connectTestDb() already connected mongoose
vi.mock('@/lib/db.server', () => ({
  connectToDatabase: async () => mongoose,
  withTransaction: async <T,>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> => {
    const session = await mongoose.startSession()
    try {
      let result: T
      await session.withTransaction(async () => {
        result = await fn(session)
      })
      return result!
    } finally {
      session.endSession()
    }
  },
  mongoose,
}))

// Import handlers AFTER vi.mock
import {
  handleGetMyRider,
  handleCreateRider,
  handleUpdateRiderStatus,
  handleUpdateRiderLocation,
  handleGetNearbyRiders,
  handleGetPendingOrdersNearby,
  handleAcceptOrder,
  handleMarkDispatched,
  handleMarkDelivered,
} from '@/server/rider.handlers'

beforeAll(async () => {
  await connectTestDb()
})
beforeEach(async () => {
  await cleanTestDb()
})
afterAll(async () => {
  await disconnectTestDb()
})

// ---------------------------------------------------------------------------
// handleCreateRider
// ---------------------------------------------------------------------------
describe('handleCreateRider', () => {
  it('should create rider and update user role via transaction', async () => {
    await createTestUser({ clerkId: 'rider_user_1', email: 'rider1@test.com' })

    const result = await handleCreateRider({
      data: {
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        phoneNumber: '09171234567',
        vehicleType: 'motorcycle',
      },
      context: { userId: 'rider_user_1' },
    })

    // Return value should be a string (the riderId)
    expect(typeof result).toBe('string')

    // Rider document must exist
    const rider = await RiderModel.findOne({ userId: 'rider_user_1' })
    expect(rider).not.toBeNull()
    expect(rider!.firstName).toBe('Juan')

    // User role must be updated to 'rider'
    const user = await UserModel.findOne({ clerkId: 'rider_user_1' })
    expect(user).not.toBeNull()
    expect(user!.role).toBe('rider')
  })

  it('should reject duplicate rider profile', async () => {
    await createTestUser({ clerkId: 'dup_rider', email: 'dup@test.com' })
    await createTestRider({ userId: 'dup_rider' })

    const result = await handleCreateRider({
      data: {
        firstName: 'Duplicate',
        lastName: 'Rider',
        phoneNumber: '09170000000',
        vehicleType: 'motorcycle',
      },
      context: { userId: 'dup_rider' },
    })

    expect(result).toEqual({ success: false, error: 'You already have a rider profile' })
  })
})

// ---------------------------------------------------------------------------
// handleGetMyRider
// ---------------------------------------------------------------------------
describe('handleGetMyRider', () => {
  it('should return rider profile for registered rider', async () => {
    await createTestRider({ userId: 'rider_1', firstName: 'Maria' })

    const result = await handleGetMyRider({ context: { userId: 'rider_1' } })

    expect(result).not.toBeNull()
    expect(result!.firstName).toBe('Maria')
  })

  it('should return null for non-rider', async () => {
    const result = await handleGetMyRider({
      context: { userId: new Types.ObjectId().toString() },
    })

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// handleUpdateRiderStatus
// ---------------------------------------------------------------------------
describe('handleUpdateRiderStatus', () => {
  it('should toggle online status', async () => {
    await createTestRider({ userId: 'status_rider', isOnline: false })

    const result = await handleUpdateRiderStatus({
      data: { isOnline: true },
      context: { userId: 'status_rider' },
    })

    expect(result).toBe(true)

    const rider = await RiderModel.findOne({ userId: 'status_rider' })
    expect(rider!.isOnline).toBe(true)
  })

  it('should return false for non-rider', async () => {
    const result = await handleUpdateRiderStatus({
      data: { isOnline: true },
      context: { userId: new Types.ObjectId().toString() },
    })

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// handleUpdateRiderLocation
// ---------------------------------------------------------------------------
describe('handleUpdateRiderLocation', () => {
  it('should update GeoJSON location', async () => {
    await createTestRider({ userId: 'loc_rider' })

    const result = await handleUpdateRiderLocation({
      data: { latitude: 15.49, longitude: 120.98 },
      context: { userId: 'loc_rider' },
    })

    expect(result).toBe(true)

    const rider = await RiderModel.findOne({ userId: 'loc_rider' })
    expect(rider!.lastLocation).toBeDefined()
    expect(rider!.lastLocation!.coordinates).toEqual([120.98, 15.49])
  })

  it('should return false for non-rider', async () => {
    const result = await handleUpdateRiderLocation({
      data: { latitude: 15.49, longitude: 120.98 },
      context: { userId: new Types.ObjectId().toString() },
    })

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// handleGetNearbyRiders
// ---------------------------------------------------------------------------
describe('handleGetNearbyRiders', () => {
  it('should return nearby online riders only', async () => {
    // Rider at center (0 km)
    await createTestRider({
      userId: 'near_1',
      isOnline: true,
      lastLocation: { type: 'Point', coordinates: [120.9734, 15.4868] },
    })
    // Rider ~1 km east
    await createTestRider({
      userId: 'near_2',
      isOnline: true,
      lastLocation: { type: 'Point', coordinates: [120.9834, 15.4868] },
    })
    // Rider ~10 km east (outside radius)
    await createTestRider({
      userId: 'far_1',
      isOnline: true,
      lastLocation: { type: 'Point', coordinates: [121.0734, 15.4868] },
    })

    const result = await handleGetNearbyRiders({
      data: { latitude: 15.4868, longitude: 120.9734, radiusMeters: 5000 },
    })

    expect(result).toHaveLength(2)
  })

  it('should exclude offline riders', async () => {
    await createTestRider({
      userId: 'online_rider',
      isOnline: true,
      lastLocation: { type: 'Point', coordinates: [120.9734, 15.4868] },
    })
    await createTestRider({
      userId: 'offline_rider',
      isOnline: false,
      lastLocation: { type: 'Point', coordinates: [120.9734, 15.4868] },
    })

    const result = await handleGetNearbyRiders({
      data: { latitude: 15.4868, longitude: 120.9734, radiusMeters: 5000 },
    })

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// handleGetPendingOrdersNearby
// ---------------------------------------------------------------------------
describe('handleGetPendingOrdersNearby', () => {
  it('should return nearby pending orders', async () => {
    const riderUserId = 'pending_rider'
    await createTestRider({ userId: riderUserId })

    // 2 pending orders with nearby delivery locations
    await createTestOrder({
      status: 'pending',
      deliveryLocation: { type: 'Point', coordinates: [120.9734, 15.4868] },
    })
    await createTestOrder({
      status: 'pending',
      deliveryLocation: { type: 'Point', coordinates: [120.9754, 15.4878] },
    })
    // 1 accepted order (should be excluded)
    await createTestOrder({
      status: 'accepted',
      deliveryLocation: { type: 'Point', coordinates: [120.9734, 15.4868] },
    })

    const result = await handleGetPendingOrdersNearby({
      data: { latitude: 15.4868, longitude: 120.9734, radiusMeters: 5000 },
      context: { userId: riderUserId },
    })

    expect(result).toHaveLength(2)
    result.forEach((order: any) => {
      expect(order.status).toBe('pending')
    })
  })

  it('should return empty for non-rider', async () => {
    await createTestOrder({ status: 'pending' })

    const result = await handleGetPendingOrdersNearby({
      data: { latitude: 15.4868, longitude: 120.9734, radiusMeters: 5000 },
      context: { userId: new Types.ObjectId().toString() },
    })

    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// handleAcceptOrder
// ---------------------------------------------------------------------------
describe('handleAcceptOrder', () => {
  it('should accept pending order', async () => {
    const riderUserId = 'accept_rider'
    await createTestRider({ userId: riderUserId })
    const order = await createTestOrder({ status: 'pending' })

    const result = await handleAcceptOrder({
      data: { orderId: order._id.toString() },
      context: { userId: riderUserId },
    })

    expect(result).toEqual({ success: true, orderId: order._id.toString() })

    const updated = await OrderModel.findById(order._id)
    expect(updated!.status).toBe('accepted')
    expect(updated!.riderId).toBe(riderUserId)
  })

  it('should handle race condition — only one rider wins', async () => {
    await createTestRider({ userId: 'racer_1' })
    await createTestRider({ userId: 'racer_2' })
    const order = await createTestOrder({ status: 'pending' })

    const results = await Promise.allSettled([
      handleAcceptOrder({
        data: { orderId: order._id.toString() },
        context: { userId: 'racer_1' },
      }),
      handleAcceptOrder({
        data: { orderId: order._id.toString() },
        context: { userId: 'racer_2' },
      }),
    ])

    const fulfilled = results.filter(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<any>[]
    const successes = fulfilled.filter((r) => r.value.success === true)
    const failures = fulfilled.filter((r) => r.value.success === false)

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
  })

  it('should fail for already accepted order', async () => {
    await createTestRider({ userId: 'first_rider' })
    await createTestRider({ userId: 'second_rider' })
    const order = await createTestOrder({ status: 'pending' })

    // First rider accepts
    await handleAcceptOrder({
      data: { orderId: order._id.toString() },
      context: { userId: 'first_rider' },
    })

    // Second rider tries to accept
    const result = await handleAcceptOrder({
      data: { orderId: order._id.toString() },
      context: { userId: 'second_rider' },
    })

    expect(result).toEqual({ success: false, error: 'Order is no longer available' })
  })

  it('should fail for non-rider', async () => {
    const order = await createTestOrder({ status: 'pending' })

    const result = await handleAcceptOrder({
      data: { orderId: order._id.toString() },
      context: { userId: new Types.ObjectId().toString() },
    })

    expect(result).toEqual({ success: false, error: 'You must register as a rider first' })
  })
})

// ---------------------------------------------------------------------------
// handleMarkDispatched
// ---------------------------------------------------------------------------
describe('handleMarkDispatched', () => {
  it('should dispatch accepted order', async () => {
    const riderUserId = 'dispatch_rider'
    await createTestRider({ userId: riderUserId })
    const order = await createTestOrder({
      status: 'accepted',
      riderId: riderUserId,
    })

    const result = await handleMarkDispatched({
      data: order._id.toString(),
      context: { userId: riderUserId },
    })

    expect(result).toBe(true)

    const updated = await OrderModel.findById(order._id)
    expect(updated!.status).toBe('dispatched')
    expect(updated!.dispatchedAt).toBeDefined()
  })

  it('should fail for wrong rider', async () => {
    await createTestRider({ userId: 'rider_a' })
    await createTestRider({ userId: 'rider_b' })
    const order = await createTestOrder({
      status: 'accepted',
      riderId: 'rider_a',
    })

    const result = await handleMarkDispatched({
      data: order._id.toString(),
      context: { userId: 'rider_b' },
    })

    expect(result).toBe(false)
  })

  it('should fail for non-accepted order', async () => {
    const riderUserId = 'dispatch_rider_2'
    await createTestRider({ userId: riderUserId })
    const order = await createTestOrder({
      status: 'pending',
      riderId: riderUserId,
    })

    const result = await handleMarkDispatched({
      data: order._id.toString(),
      context: { userId: riderUserId },
    })

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// handleMarkDelivered
// ---------------------------------------------------------------------------
describe('handleMarkDelivered', () => {
  it('should deliver dispatched order', async () => {
    const riderUserId = 'deliver_rider'
    await createTestRider({ userId: riderUserId })
    const order = await createTestOrder({
      status: 'dispatched',
      riderId: riderUserId,
    })

    const result = await handleMarkDelivered({
      data: order._id.toString(),
      context: { userId: riderUserId },
    })

    expect(result).toBe(true)

    const updated = await OrderModel.findById(order._id)
    expect(updated!.status).toBe('delivered')
    expect(updated!.deliveredAt).toBeDefined()
  })

  it('should fail for wrong rider', async () => {
    await createTestRider({ userId: 'deliver_a' })
    await createTestRider({ userId: 'deliver_b' })
    const order = await createTestOrder({
      status: 'dispatched',
      riderId: 'deliver_a',
    })

    const result = await handleMarkDelivered({
      data: order._id.toString(),
      context: { userId: 'deliver_b' },
    })

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Full order lifecycle
// ---------------------------------------------------------------------------
describe('Full order lifecycle', () => {
  it('should complete pending → accepted → dispatched → delivered', async () => {
    const riderUserId = 'lifecycle_rider'
    await createTestRider({ userId: riderUserId })
    const order = await createTestOrder({ status: 'pending' })
    const orderId = order._id.toString()

    // Step 1: Accept
    const acceptResult = await handleAcceptOrder({
      data: { orderId },
      context: { userId: riderUserId },
    })
    expect(acceptResult).toEqual({ success: true, orderId })

    const afterAccept = await OrderModel.findById(order._id)
    expect(afterAccept!.status).toBe('accepted')
    expect(afterAccept!.riderId).toBe(riderUserId)
    expect(afterAccept!.acceptedAt).toBeDefined()

    // Step 2: Dispatch
    const dispatchResult = await handleMarkDispatched({
      data: orderId,
      context: { userId: riderUserId },
    })
    expect(dispatchResult).toBe(true)

    const afterDispatch = await OrderModel.findById(order._id)
    expect(afterDispatch!.status).toBe('dispatched')
    expect(afterDispatch!.dispatchedAt).toBeDefined()

    // Step 3: Deliver
    const deliverResult = await handleMarkDelivered({
      data: orderId,
      context: { userId: riderUserId },
    })
    expect(deliverResult).toBe(true)

    const afterDeliver = await OrderModel.findById(order._id)
    expect(afterDeliver!.status).toBe('delivered')
    expect(afterDeliver!.deliveredAt).toBeDefined()

    // Verify all timestamps are set
    expect(afterDeliver!.acceptedAt).toBeInstanceOf(Date)
    expect(afterDeliver!.dispatchedAt).toBeInstanceOf(Date)
    expect(afterDeliver!.deliveredAt).toBeInstanceOf(Date)
  })
})
