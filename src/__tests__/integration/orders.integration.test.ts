import { vi } from 'vitest'
import mongoose from 'mongoose'
import { connectTestDb, cleanTestDb, disconnectTestDb } from './helpers/db-setup'
import { createTestMerchant, createTestOrder } from './helpers/seed'
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
  handleCreateRefillRequest,
  handleGetUserOrders,
  handleGetMerchantOrders,
  handleCancelOrder,
  handleUpdateOrderStatus,
  handleGetOrderById,
} from '@/server/orders.handlers'

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
// handleCreateRefillRequest
// ---------------------------------------------------------------------------
describe('handleCreateRefillRequest', () => {
  it('should create order with server-calculated price', async () => {
    const merchant = await createTestMerchant({
      pricing: { 'Gasul-11kg': 800 },
      brandsAccepted: ['Gasul'],
      tankSizes: ['11kg'],
      isOpen: true,
      deliveryRadiusMeters: 5000,
    })

    const quantity = 2
    const orderId = await handleCreateRefillRequest({
      data: {
        merchantId: merchant._id.toString(),
        tankBrand: 'Gasul',
        tankSize: '11kg',
        quantity,
        deliveryLocation: { type: 'Point', coordinates: [120.9740, 15.4870] },
        deliveryAddress: '456 Nearby Street',
      },
      context: { userId: 'user_buyer_1' },
    })

    expect(typeof orderId).toBe('string')

    const order = await OrderModel.findById(orderId).lean()
    expect(order).not.toBeNull()
    expect(order!.totalPrice).toBe(800 * quantity)
    expect(order!.status).toBe('pending')
    expect(order!.userId).toBe('user_buyer_1')
  })

  it('should reject when merchant is closed', async () => {
    const merchant = await createTestMerchant({
      isOpen: false,
      pricing: { 'Gasul-11kg': 800 },
      brandsAccepted: ['Gasul'],
      tankSizes: ['11kg'],
    })

    await expect(
      handleCreateRefillRequest({
        data: {
          merchantId: merchant._id.toString(),
          tankBrand: 'Gasul',
          tankSize: '11kg',
          quantity: 1,
          deliveryLocation: { type: 'Point', coordinates: [120.9740, 15.4870] },
          deliveryAddress: '123 Test Street',
        },
        context: { userId: 'user_buyer_1' },
      }),
    ).rejects.toThrow('currently closed')
  })

  it('should reject when brand not carried', async () => {
    const merchant = await createTestMerchant({
      brandsAccepted: ['Gasul'],
      pricing: { 'Gasul-11kg': 800 },
      tankSizes: ['11kg'],
      isOpen: true,
    })

    await expect(
      handleCreateRefillRequest({
        data: {
          merchantId: merchant._id.toString(),
          tankBrand: 'Petron',
          tankSize: '11kg',
          quantity: 1,
          deliveryLocation: { type: 'Point', coordinates: [120.9740, 15.4870] },
          deliveryAddress: '123 Test Street',
        },
        context: { userId: 'user_buyer_1' },
      }),
    ).rejects.toThrow('does not carry Petron')
  })

  it('should reject when tank size not carried', async () => {
    const merchant = await createTestMerchant({
      tankSizes: ['11kg'],
      brandsAccepted: ['Gasul'],
      pricing: { 'Gasul-11kg': 800 },
      isOpen: true,
    })

    await expect(
      handleCreateRefillRequest({
        data: {
          merchantId: merchant._id.toString(),
          tankBrand: 'Gasul',
          tankSize: '50kg',
          quantity: 1,
          deliveryLocation: { type: 'Point', coordinates: [120.9740, 15.4870] },
          deliveryAddress: '123 Test Street',
        },
        context: { userId: 'user_buyer_1' },
      }),
    ).rejects.toThrow('does not carry 50kg')
  })

  it('should reject when pricing not configured', async () => {
    const merchant = await createTestMerchant({
      pricing: {},
      brandsAccepted: ['Gasul'],
      tankSizes: ['11kg'],
      isOpen: true,
    })

    await expect(
      handleCreateRefillRequest({
        data: {
          merchantId: merchant._id.toString(),
          tankBrand: 'Gasul',
          tankSize: '11kg',
          quantity: 1,
          deliveryLocation: { type: 'Point', coordinates: [120.9740, 15.4870] },
          deliveryAddress: '123 Test Street',
        },
        context: { userId: 'user_buyer_1' },
      }),
    ).rejects.toThrow('Pricing not configured')
  })

  it('should reject delivery outside radius', async () => {
    const merchant = await createTestMerchant({
      location: { type: 'Point', coordinates: [120.9734, 15.4868] },
      deliveryRadiusMeters: 2000,
      pricing: { 'Gasul-11kg': 800 },
      brandsAccepted: ['Gasul'],
      tankSizes: ['11kg'],
      isOpen: true,
    })

    await expect(
      handleCreateRefillRequest({
        data: {
          merchantId: merchant._id.toString(),
          tankBrand: 'Gasul',
          tankSize: '11kg',
          quantity: 1,
          deliveryLocation: { type: 'Point', coordinates: [121.0734, 15.4868] },
          deliveryAddress: '999 Far Away Street',
        },
        context: { userId: 'user_buyer_1' },
      }),
    ).rejects.toThrow('Delivery location is')
  })

  it('should accept delivery inside polygon', async () => {
    const merchant = await createTestMerchant({
      deliveryPolygon: {
        type: 'Polygon',
        coordinates: [
          [
            [120.95, 15.47],
            [121.00, 15.47],
            [121.00, 15.50],
            [120.95, 15.50],
            [120.95, 15.47],
          ],
        ],
      },
      pricing: { 'Gasul-11kg': 800 },
      brandsAccepted: ['Gasul'],
      tankSizes: ['11kg'],
      isOpen: true,
    })

    const orderId = await handleCreateRefillRequest({
      data: {
        merchantId: merchant._id.toString(),
        tankBrand: 'Gasul',
        tankSize: '11kg',
        quantity: 1,
        deliveryLocation: { type: 'Point', coordinates: [120.9734, 15.4868] },
        deliveryAddress: '123 Inside Polygon Street',
      },
      context: { userId: 'user_buyer_1' },
    })

    expect(typeof orderId).toBe('string')
  })

  it('should reject delivery outside polygon', async () => {
    const merchant = await createTestMerchant({
      deliveryPolygon: {
        type: 'Polygon',
        coordinates: [
          [
            [120.95, 15.47],
            [121.00, 15.47],
            [121.00, 15.50],
            [120.95, 15.50],
            [120.95, 15.47],
          ],
        ],
      },
      pricing: { 'Gasul-11kg': 800 },
      brandsAccepted: ['Gasul'],
      tankSizes: ['11kg'],
      isOpen: true,
    })

    await expect(
      handleCreateRefillRequest({
        data: {
          merchantId: merchant._id.toString(),
          tankBrand: 'Gasul',
          tankSize: '11kg',
          quantity: 1,
          deliveryLocation: { type: 'Point', coordinates: [121.10, 15.60] },
          deliveryAddress: '999 Outside Polygon Street',
        },
        context: { userId: 'user_buyer_1' },
      }),
    ).rejects.toThrow('outside this merchant')
  })

  it('should calculate price as unitPrice * quantity', async () => {
    const merchant = await createTestMerchant({
      pricing: { 'Gasul-11kg': 800 },
      brandsAccepted: ['Gasul'],
      tankSizes: ['11kg'],
      isOpen: true,
      deliveryRadiusMeters: 5000,
    })

    const orderId = await handleCreateRefillRequest({
      data: {
        merchantId: merchant._id.toString(),
        tankBrand: 'Gasul',
        tankSize: '11kg',
        quantity: 3,
        deliveryLocation: { type: 'Point', coordinates: [120.9740, 15.4870] },
        deliveryAddress: '456 Nearby Street',
      },
      context: { userId: 'user_buyer_1' },
    })

    const order = await OrderModel.findById(orderId).lean()
    expect(order).not.toBeNull()
    expect(order!.totalPrice).toBe(2400)
  })
})

// ---------------------------------------------------------------------------
// handleGetUserOrders
// ---------------------------------------------------------------------------
describe('handleGetUserOrders', () => {
  it('should return only orders for the authenticated user', async () => {
    const merchant = await createTestMerchant()

    await createTestOrder({ userId: 'user_A', merchantId: merchant._id })
    await createTestOrder({ userId: 'user_A', merchantId: merchant._id })
    await createTestOrder({ userId: 'user_A', merchantId: merchant._id })
    await createTestOrder({ userId: 'user_B', merchantId: merchant._id })
    await createTestOrder({ userId: 'user_B', merchantId: merchant._id })

    const orders = await handleGetUserOrders({ context: { userId: 'user_A' } })
    expect(orders).toHaveLength(3)
    for (const order of orders) {
      expect(order.userId).toBe('user_A')
    }
  })

  it('should return orders sorted by createdAt desc', async () => {
    const merchant = await createTestMerchant()

    const order1 = await createTestOrder({ userId: 'user_A', merchantId: merchant._id, tankBrand: 'Gasul' })
    const order2 = await createTestOrder({ userId: 'user_A', merchantId: merchant._id, tankBrand: 'Solane' })
    const order3 = await createTestOrder({ userId: 'user_A', merchantId: merchant._id, tankBrand: 'Petron' })

    const orders = await handleGetUserOrders({ context: { userId: 'user_A' } })
    expect(orders).toHaveLength(3)

    // Newest first — order3 was created last
    expect(orders[0]._id).toBe(order3._id.toString())
    expect(orders[1]._id).toBe(order2._id.toString())
    expect(orders[2]._id).toBe(order1._id.toString())
  })
})

// ---------------------------------------------------------------------------
// handleGetMerchantOrders
// ---------------------------------------------------------------------------
describe('handleGetMerchantOrders', () => {
  it('should return orders for the specified merchant', async () => {
    const merchantA = await createTestMerchant({ shopName: 'Shop A' })
    const merchantB = await createTestMerchant({ shopName: 'Shop B', ownerUserId: 'owner_b', doePermitNumber: 'DOE-B' })

    await createTestOrder({ userId: 'user_1', merchantId: merchantA._id })
    await createTestOrder({ userId: 'user_2', merchantId: merchantA._id })
    await createTestOrder({ userId: 'user_3', merchantId: merchantB._id })

    const orders = await handleGetMerchantOrders({
      data: { merchantId: merchantA._id.toString() },
    })

    expect(orders).toHaveLength(2)
    for (const order of orders) {
      expect(order.merchantId).toBe(merchantA._id.toString())
    }
  })
})

// ---------------------------------------------------------------------------
// handleCancelOrder
// ---------------------------------------------------------------------------
describe('handleCancelOrder', () => {
  it('should cancel pending order as owner', async () => {
    const merchant = await createTestMerchant()
    const order = await createTestOrder({
      userId: 'user_A',
      merchantId: merchant._id,
      status: 'pending',
    })

    const result = await handleCancelOrder({
      data: { orderId: order._id.toString(), cancellationReason: 'Changed my mind' },
      context: { userId: 'user_A' },
    })

    expect(result).toBe(true)

    const updated = await OrderModel.findById(order._id).lean()
    expect(updated!.status).toBe('cancelled')
    expect(updated!.cancellationReason).toBe('Changed my mind')
  })

  it('should not cancel order owned by another user', async () => {
    const merchant = await createTestMerchant()
    const order = await createTestOrder({
      userId: 'user_A',
      merchantId: merchant._id,
      status: 'pending',
    })

    const result = await handleCancelOrder({
      data: { orderId: order._id.toString() },
      context: { userId: 'user_B' },
    })

    expect(result).toBe(false)

    const unchanged = await OrderModel.findById(order._id).lean()
    expect(unchanged!.status).toBe('pending')
  })

  it('should not cancel non-pending order', async () => {
    const merchant = await createTestMerchant()
    const order = await createTestOrder({
      userId: 'user_A',
      merchantId: merchant._id,
      status: 'accepted',
    })

    const result = await handleCancelOrder({
      data: { orderId: order._id.toString() },
      context: { userId: 'user_A' },
    })

    expect(result).toBe(false)

    const unchanged = await OrderModel.findById(order._id).lean()
    expect(unchanged!.status).toBe('accepted')
  })
})

// ---------------------------------------------------------------------------
// handleUpdateOrderStatus — RBAC
// ---------------------------------------------------------------------------
describe('handleUpdateOrderStatus — RBAC', () => {
  it('should allow merchant owner to accept pending order', async () => {
    const merchant = await createTestMerchant({ ownerUserId: 'merchant_user' })
    const order = await createTestOrder({
      userId: 'customer_1',
      merchantId: merchant._id,
      status: 'pending',
    })

    const result = await handleUpdateOrderStatus({
      data: { orderId: order._id.toString(), status: 'accepted' },
      context: { userId: 'merchant_user' },
    })

    expect(result).toBe(true)

    const updated = await OrderModel.findById(order._id).lean()
    expect(updated!.status).toBe('accepted')
    expect(updated!.acceptedAt).toBeDefined()
  })

  it('should not allow customer to accept order', async () => {
    const merchant = await createTestMerchant({ ownerUserId: 'merchant_user' })
    const order = await createTestOrder({
      userId: 'customer_1',
      merchantId: merchant._id,
      status: 'pending',
    })

    const result = await handleUpdateOrderStatus({
      data: { orderId: order._id.toString(), status: 'accepted' },
      context: { userId: 'customer_1' },
    })

    expect(result).toBe(false)

    const unchanged = await OrderModel.findById(order._id).lean()
    expect(unchanged!.status).toBe('pending')
  })

  it('should allow assigned rider to dispatch', async () => {
    const merchant = await createTestMerchant({ ownerUserId: 'merchant_user' })
    const order = await createTestOrder({
      userId: 'customer_1',
      merchantId: merchant._id,
      status: 'accepted',
      riderId: 'rider_user',
    })

    const result = await handleUpdateOrderStatus({
      data: { orderId: order._id.toString(), status: 'dispatched' },
      context: { userId: 'rider_user' },
    })

    expect(result).toBe(true)

    const updated = await OrderModel.findById(order._id).lean()
    expect(updated!.status).toBe('dispatched')
  })

  it('should not allow non-assigned rider to dispatch', async () => {
    const merchant = await createTestMerchant({ ownerUserId: 'merchant_user' })
    const order = await createTestOrder({
      userId: 'customer_1',
      merchantId: merchant._id,
      status: 'accepted',
      riderId: 'rider_A',
    })

    const result = await handleUpdateOrderStatus({
      data: { orderId: order._id.toString(), status: 'dispatched' },
      context: { userId: 'rider_B' },
    })

    expect(result).toBe(false)

    const unchanged = await OrderModel.findById(order._id).lean()
    expect(unchanged!.status).toBe('accepted')
  })

  it('should not allow customer to dispatch', async () => {
    const merchant = await createTestMerchant({ ownerUserId: 'merchant_user' })
    const order = await createTestOrder({
      userId: 'customer_1',
      merchantId: merchant._id,
      status: 'accepted',
      riderId: 'rider_user',
    })

    const result = await handleUpdateOrderStatus({
      data: { orderId: order._id.toString(), status: 'dispatched' },
      context: { userId: 'customer_1' },
    })

    expect(result).toBe(false)

    const unchanged = await OrderModel.findById(order._id).lean()
    expect(unchanged!.status).toBe('accepted')
  })
})

// ---------------------------------------------------------------------------
// handleGetOrderById — access control
// ---------------------------------------------------------------------------
describe('handleGetOrderById — access control', () => {
  it('should return order to owner', async () => {
    const merchant = await createTestMerchant()
    const order = await createTestOrder({
      userId: 'user_A',
      merchantId: merchant._id,
    })

    const result = await handleGetOrderById({
      data: { orderId: order._id.toString() },
      context: { userId: 'user_A' },
    })

    expect(result).not.toBeNull()
    expect(result!._id).toBe(order._id.toString())
    expect(result!.userId).toBe('user_A')
    expect(result!.status).toBe('pending')
  })

  it('should return order to assigned rider', async () => {
    const merchant = await createTestMerchant()
    const order = await createTestOrder({
      userId: 'user_A',
      merchantId: merchant._id,
      riderId: 'rider_1',
    })

    const result = await handleGetOrderById({
      data: { orderId: order._id.toString() },
      context: { userId: 'rider_1' },
    })

    expect(result).not.toBeNull()
    expect(result!._id).toBe(order._id.toString())
  })

  it('should return order to merchant owner', async () => {
    const merchant = await createTestMerchant({ ownerUserId: 'merchant_user' })
    const order = await createTestOrder({
      userId: 'customer_1',
      merchantId: merchant._id,
    })

    const result = await handleGetOrderById({
      data: { orderId: order._id.toString() },
      context: { userId: 'merchant_user' },
    })

    expect(result).not.toBeNull()
    expect(result!._id).toBe(order._id.toString())
  })

  it('should return null to unauthorized user', async () => {
    const merchant = await createTestMerchant()
    const order = await createTestOrder({
      userId: 'user_A',
      merchantId: merchant._id,
    })

    const result = await handleGetOrderById({
      data: { orderId: order._id.toString() },
      context: { userId: 'random_stranger' },
    })

    expect(result).toBeNull()
  })

  it('should return null for nonexistent order', async () => {
    const fakeId = new Types.ObjectId().toString()

    const result = await handleGetOrderById({
      data: { orderId: fakeId },
      context: { userId: 'user_A' },
    })

    expect(result).toBeNull()
  })
})
