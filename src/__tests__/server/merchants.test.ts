import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'

// Mock createServerFn to bypass TanStack middleware — call handler directly
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: <T, R>(fn: (args: { data: T }) => R) => (args: { data: T }) => fn(args),
  }),
}))

import { getNearbyMerchants, getMerchantById, createMerchant, updateMerchantPricing, getMerchantsInPolygon } from '@/server/merchants.functions'
import { MerchantModel } from '@/models/Merchant.server'

const mockMerchant = {
  _id: new Types.ObjectId(),
  shopName: 'Test Shop',
  doePermitNumber: 'DOE-001',
  location: { type: 'Point' as const, coordinates: [120.9842, 14.5995] as [number, number] },
  brandsAccepted: ['Gasul'],
  pricing: { '11kg': 1200 },
  isOpen: true,
  isVerified: true,
  tankSizes: ['11kg'],
  deliveryRadiusMeters: 5000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

vi.mock('@/lib/db.server', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/models/Merchant.server', () => ({
  MerchantModel: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}))

describe('getNearbyMerchants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call connectToDatabase', async () => {
    vi.mocked(MerchantModel.find).mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as never)

    await getNearbyMerchants({ data: { latitude: 14.5995, longitude: 120.9842, radiusMeters: 5000 } } as any)

    const { connectToDatabase } = await import('@/lib/db.server')
    expect(connectToDatabase).toHaveBeenCalled()
  })

  it('should build correct $nearSphere query', async () => {
    vi.mocked(MerchantModel.find).mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockMerchant]),
      }),
    } as never)

    await getNearbyMerchants({
      data: { latitude: 14.5995, longitude: 120.9842, radiusMeters: 5000 }
    } as any)

    expect(MerchantModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          $nearSphere: expect.objectContaining({
            $maxDistance: 5000,
          }),
        }),
      })
    )
  })

  it('should apply brand filter when provided', async () => {
    vi.mocked(MerchantModel.find).mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as never)

    await getNearbyMerchants({
      data: { latitude: 14.5995, longitude: 120.9842, brand: 'Gasul' }
    } as any)

    expect(MerchantModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        brandsAccepted: 'Gasul',
      })
    )
  })

  it('should return merchants with string _id', async () => {
    vi.mocked(MerchantModel.find).mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockMerchant]),
      }),
    } as never)

    const result = await getNearbyMerchants({
      data: { latitude: 14.5995, longitude: 120.9842 }
    } as any)

    expect(result[0]._id).toBe(mockMerchant._id.toString())
  })

  it('should limit results to 20', async () => {
    const mockLimit = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    })
    vi.mocked(MerchantModel.find).mockReturnValue({
      limit: mockLimit,
    } as never)

    await getNearbyMerchants({
      data: { latitude: 14.5995, longitude: 120.9842 }
    } as any)

    expect(mockLimit).toHaveBeenCalledWith(20)
  })
})

describe('getMerchantById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null for invalid id', async () => {
    const result = await getMerchantById({ data: undefined } as any)

    expect(result).toBeNull()
  })

  it('should return merchant when found', async () => {
    vi.mocked(MerchantModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockMerchant),
    } as never)

    const result = await getMerchantById({ data: { merchantId: mockMerchant._id.toString() } } as any)

    expect(result).not.toBeNull()
    expect(result?.shopName).toBe('Test Shop')
  })

  it('should return null when not found', async () => {
    vi.mocked(MerchantModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never)

    const result = await getMerchantById({ data: { merchantId: new Types.ObjectId().toString() } } as any)

    expect(result).toBeNull()
  })
})

describe('createMerchant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create merchant with valid data', async () => {
    vi.mocked(MerchantModel.create).mockResolvedValue(mockMerchant as never)

    const result = await createMerchant({
      data: {
        shopName: 'Test Shop',
        doePermitNumber: 'DOE-001',
        location: { type: 'Point', coordinates: [120.9842, 14.5995] },
        brandsAccepted: ['Gasul'],
        pricing: { '11kg': 1200 },
        tankSizes: ['11kg'],
      },
    } as any)

    expect(MerchantModel.create).toHaveBeenCalled()
    expect(result).toBe(mockMerchant._id.toString())
  })
})

describe('updateMerchantPricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update pricing successfully', async () => {
    vi.mocked(MerchantModel.findByIdAndUpdate).mockResolvedValue(mockMerchant as never)

    const result = await updateMerchantPricing({
      data: {
        merchantId: mockMerchant._id.toString(),
        pricing: { '11kg': 1500 },
      },
    } as any)

    expect(result).toBe(true)
    expect(MerchantModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockMerchant._id.toString(),
      expect.objectContaining({
        $set: expect.objectContaining({
          pricing: { '11kg': 1500 },
        }),
      }),
      { new: true }
    )
  })

  it('should return false when merchant not found', async () => {
    vi.mocked(MerchantModel.findByIdAndUpdate).mockResolvedValue(null as never)

    const result = await updateMerchantPricing({
      data: {
        merchantId: new Types.ObjectId().toString(),
        pricing: { '11kg': 1500 },
      },
    } as any)

    expect(result).toBe(false)
  })
})

describe('getMerchantsInPolygon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find merchants within polygon', async () => {
    vi.mocked(MerchantModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([mockMerchant]),
    } as never)

    const polygon = [[120.9, 14.5], [121.0, 14.5], [121.0, 14.6], [120.9, 14.6]]

    await getMerchantsInPolygon({ data: { polygon } } as any)

    expect(MerchantModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          $geoWithin: expect.objectContaining({
            $polygon: expect.any(Array),
          }),
        }),
      })
    )
  })
})
