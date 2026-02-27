import { vi } from 'vitest'
import mongoose from 'mongoose'
import { connectTestDb, cleanTestDb, disconnectTestDb } from './helpers/db-setup'
import { createTestMerchant, createTestOrder } from './helpers/seed'
import { MerchantModel } from '@/models/Merchant.server'
import { Types } from 'mongoose'

// Mock connectToDatabase to be a no-op — connectTestDb() already connected mongoose
// to refillr_test. Without this, the real connectToDatabase() would re-connect with
// dbName: 'refillr', pointing queries at the wrong database.
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

// Import handlers AFTER vi.mock so they receive the mocked db.server
import {
  handleGetNearbyMerchants,
  handleGetMerchantById,
  handleGetMyMerchant,
  handleCreateMerchant,
  handleUpdateMerchantPricing,
  handleGetMerchantsInPolygon,
  handleGetOrderAnalytics,
  handleUpdateInventory,
} from '@/server/merchants.handlers'

beforeAll(async () => {
  await connectTestDb()
})
beforeEach(async () => {
  await cleanTestDb()
})
afterAll(async () => {
  await disconnectTestDb()
})

describe('handleCreateMerchant', () => {
  it('should create a merchant and persist to DB', async () => {
    const userId = 'user_creator_1'

    const merchantId = await handleCreateMerchant({
      data: {
        shopName: 'My LPG Store',
        doePermitNumber: 'DOE-12345',
        location: { type: 'Point', coordinates: [120.9734, 15.4868] },
        brandsAccepted: ['Gasul', 'Solane'],
        pricing: { 'Gasul-11kg': 800, 'Solane-11kg': 850 },
        tankSizes: ['11kg', '22kg'],
      },
      context: { userId },
    })

    expect(merchantId).toBeDefined()
    expect(typeof merchantId).toBe('string')

    const persisted = await MerchantModel.findOne({ ownerUserId: userId })
    expect(persisted).not.toBeNull()
    expect(persisted!.shopName).toBe('My LPG Store')
    expect(persisted!.doePermitNumber).toBe('DOE-12345')
    expect(persisted!.brandsAccepted).toEqual(['Gasul', 'Solane'])
    expect(persisted!.tankSizes).toEqual(['11kg', '22kg'])
  })

  it('should reject duplicate merchant for same user', async () => {
    const userId = 'user_dup'

    await handleCreateMerchant({
      data: {
        shopName: 'First Shop',
        doePermitNumber: 'DOE-FIRST',
        location: { type: 'Point', coordinates: [120.9734, 15.4868] },
        brandsAccepted: ['Gasul'],
        pricing: { 'Gasul-11kg': 800 },
        tankSizes: ['11kg'],
      },
      context: { userId },
    })

    await expect(
      handleCreateMerchant({
        data: {
          shopName: 'Second Shop',
          doePermitNumber: 'DOE-SECOND',
          location: { type: 'Point', coordinates: [120.9734, 15.4868] },
          brandsAccepted: ['Solane'],
          pricing: { 'Solane-11kg': 850 },
          tankSizes: ['11kg'],
        },
        context: { userId },
      }),
    ).rejects.toThrow('Failed to create merchant profile')
  })
})

describe('handleGetNearbyMerchants', () => {
  it('should return merchants within radius', async () => {
    // Center — 0km from query point
    await createTestMerchant({
      shopName: 'Center Shop',
      location: { type: 'Point', coordinates: [120.9734, 15.4868] },
    })
    // About 1km east
    await createTestMerchant({
      shopName: 'Near Shop',
      location: { type: 'Point', coordinates: [120.9834, 15.4868] },
    })
    // About 10km east — outside 5km radius
    await createTestMerchant({
      shopName: 'Far Shop',
      location: { type: 'Point', coordinates: [121.0734, 15.4868] },
    })

    const results = await handleGetNearbyMerchants({
      data: { latitude: 15.4868, longitude: 120.9734, radiusMeters: 5000 },
    })

    expect(results).toHaveLength(2)
    const names = results.map((m: any) => m.shopName)
    expect(names).toContain('Center Shop')
    expect(names).toContain('Near Shop')
    expect(names).not.toContain('Far Shop')
  })

  it('should filter by brand', async () => {
    await createTestMerchant({
      shopName: 'Gasul Only',
      brandsAccepted: ['Gasul'],
      location: { type: 'Point', coordinates: [120.9734, 15.4868] },
    })
    await createTestMerchant({
      shopName: 'Solane Only',
      brandsAccepted: ['Solane'],
      location: { type: 'Point', coordinates: [120.9744, 15.4868] },
    })

    const results = await handleGetNearbyMerchants({
      data: { latitude: 15.4868, longitude: 120.9734, radiusMeters: 5000, brand: 'Gasul' },
    })

    expect(results).toHaveLength(1)
    expect(results[0].shopName).toBe('Gasul Only')
  })
})

describe('handleGetMerchantById', () => {
  it('should return merchant when found', async () => {
    const merchant = await createTestMerchant({ shopName: 'By ID Shop' })

    const result = await handleGetMerchantById({
      data: { merchantId: merchant._id.toString() },
    })

    expect(result).not.toBeNull()
    expect(result!._id).toBe(merchant._id.toString())
    expect(result!.shopName).toBe('By ID Shop')
  })

  it('should return null when not found', async () => {
    const fakeId = new Types.ObjectId().toString()

    const result = await handleGetMerchantById({
      data: { merchantId: fakeId },
    })

    expect(result).toBeNull()
  })
})

describe('handleGetMyMerchant', () => {
  it('should return merchant for owner', async () => {
    await createTestMerchant({
      ownerUserId: 'user_owner',
      shopName: 'Owner Shop',
    })

    const result = await handleGetMyMerchant({
      context: { userId: 'user_owner' },
    })

    expect(result).not.toBeNull()
    expect(result!.shopName).toBe('Owner Shop')
    expect(result!.ownerUserId).toBe('user_owner')
  })

  it('should return null for non-owner', async () => {
    await createTestMerchant({
      ownerUserId: 'user_owner',
      shopName: 'Owner Shop',
    })

    const result = await handleGetMyMerchant({
      context: { userId: 'user_other' },
    })

    expect(result).toBeNull()
  })
})

describe('handleUpdateMerchantPricing', () => {
  it('should update pricing and persist', async () => {
    const merchant = await createTestMerchant({
      pricing: { 'Gasul-11kg': 800 },
    })

    const newPricing = { 'Gasul-11kg': 900, 'Solane-22kg': 1600 }

    const success = await handleUpdateMerchantPricing({
      data: { merchantId: merchant._id.toString(), pricing: newPricing },
    })

    expect(success).toBe(true)

    const updated = await MerchantModel.findById(merchant._id).lean()
    expect(updated).not.toBeNull()
    expect(updated!.pricing).toEqual(newPricing)
  })
})

describe('handleGetMerchantsInPolygon', () => {
  it('should return merchants inside polygon only', async () => {
    // Inside the polygon (Cabanatuan center)
    await createTestMerchant({
      shopName: 'Inside Shop',
      location: { type: 'Point', coordinates: [120.975, 15.485] },
    })
    // Outside the polygon (far east)
    await createTestMerchant({
      shopName: 'Outside Shop',
      location: { type: 'Point', coordinates: [121.10, 15.485] },
    })

    // Rectangle polygon around Cabanatuan center
    // polygon[0] is the array of coordinate pairs passed to $polygon
    const polygon: number[][][] = [
      [
        [120.95, 15.47],
        [121.00, 15.47],
        [121.00, 15.50],
        [120.95, 15.50],
      ],
    ]

    const results = await handleGetMerchantsInPolygon({
      data: { polygon },
    })

    expect(results).toHaveLength(1)
    expect(results[0].shopName).toBe('Inside Shop')
  })
})

describe('handleUpdateInventory', () => {
  it('should update tankSizes and brandsAccepted', async () => {
    const merchant = await createTestMerchant({
      tankSizes: ['11kg'],
      brandsAccepted: ['Gasul'],
    })

    const success = await handleUpdateInventory({
      data: {
        merchantId: merchant._id.toString(),
        tankSizes: ['11kg', '22kg', '50kg'],
        brandsAccepted: ['Gasul', 'Solane', 'Petron Gasul'],
      },
    })

    expect(success).toBe(true)

    const updated = await MerchantModel.findById(merchant._id).lean()
    expect(updated).not.toBeNull()
    expect(updated!.tankSizes).toEqual(['11kg', '22kg', '50kg'])
    expect(updated!.brandsAccepted).toEqual(['Gasul', 'Solane', 'Petron Gasul'])
  })
})

describe('handleGetOrderAnalytics', () => {
  it('should calculate analytics from orders', async () => {
    const merchant = await createTestMerchant({ shopName: 'Analytics Shop' })
    const merchantId = merchant._id

    // 2 delivered Gasul 11kg orders
    await createTestOrder({
      merchantId,
      tankBrand: 'Gasul',
      tankSize: '11kg',
      quantity: 1,
      totalPrice: 800,
      status: 'delivered',
    })
    await createTestOrder({
      merchantId,
      tankBrand: 'Gasul',
      tankSize: '11kg',
      quantity: 1,
      totalPrice: 800,
      status: 'delivered',
    })
    // 1 cancelled Solane 22kg order
    await createTestOrder({
      merchantId,
      tankBrand: 'Solane',
      tankSize: '22kg',
      quantity: 1,
      totalPrice: 1500,
      status: 'cancelled',
    })

    const analytics = await handleGetOrderAnalytics({
      data: { merchantId: merchantId.toString() },
    })

    expect(analytics.totalOrders).toBe(3)
    expect(analytics.deliveredOrders).toBe(2)
    expect(analytics.cancelledOrders).toBe(1)
    expect(analytics.totalRevenue).toBe(800 + 800 + 1500)

    // By brand
    expect(analytics.byBrand['Gasul'].count).toBe(2)
    expect(analytics.byBrand['Gasul'].revenue).toBe(1600)
    expect(analytics.byBrand['Solane'].count).toBe(1)
    expect(analytics.byBrand['Solane'].revenue).toBe(1500)

    // By size
    expect(analytics.bySize['11kg'].count).toBe(2)
    expect(analytics.bySize['11kg'].revenue).toBe(1600)
    expect(analytics.bySize['22kg'].count).toBe(1)
    expect(analytics.bySize['22kg'].revenue).toBe(1500)
  })
})
