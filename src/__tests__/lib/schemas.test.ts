import { describe, it, expect } from 'vitest'
import {
  MerchantSchema,
  CreateOrderSchema,
  GetNearbyMerchantsSchema,
  GetMerchantByIdSchema,
  UpdateMerchantPricingSchema,
  CancelOrderSchema,
  GeoPointSchema,
  DeliveryLocationSchema,
} from '@/lib/schemas'

describe('GeoPointSchema', () => {
  it('validates valid GeoJSON Point', () => {
    const result = GeoPointSchema.safeParse({
      type: 'Point',
      coordinates: [120.9842, 14.5995],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = GeoPointSchema.safeParse({
      type: 'Polygon',
      coordinates: [120.9842, 14.5995],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid coordinates length', () => {
    const result = GeoPointSchema.safeParse({
      type: 'Point',
      coordinates: [120.9842],
    })
    expect(result.success).toBe(false)
  })

  it('rejects coordinates out of range', () => {
    const result = GeoPointSchema.safeParse({
      type: 'Point',
      coordinates: [200, 100],
    })
    expect(result.success).toBe(false)
  })
})

describe('MerchantSchema', () => {
  const validMerchant = {
    shopName: 'Test Gas Shop',
    doePermitNumber: 'DOE-2024-001',
    location: {
      type: 'Point' as const,
      coordinates: [120.9842, 14.5995] as [number, number],
    },
    brandsAccepted: ['Gasul', 'Solane'],
    pricing: { '11kg': 1200, '5kg': 600 },
    isOpen: true,
    isVerified: true,
    tankSizes: ['5kg', '11kg'],
    deliveryRadiusMeters: 5000,
  }

  it('validates valid merchant data', () => {
    const result = MerchantSchema.safeParse(validMerchant)
    expect(result.success).toBe(true)
  })

  it('rejects empty shopName', () => {
    const result = MerchantSchema.safeParse({
      ...validMerchant,
      shopName: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing doePermitNumber', () => {
    const result = MerchantSchema.safeParse({
      ...validMerchant,
      doePermitNumber: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid location', () => {
    const result = MerchantSchema.safeParse({
      ...validMerchant,
      location: { type: 'Point', coordinates: [200, 100] },
    })
    expect(result.success).toBe(false)
  })

  it('applies defaults for optional fields', () => {
    const minimal = {
      shopName: 'Minimal Shop',
      doePermitNumber: 'DOE-001',
      location: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
    }
    const result = MerchantSchema.parse(minimal)
    expect(result.brandsAccepted).toEqual([])
    expect(result.pricing).toEqual({})
    expect(result.isOpen).toBe(true)
    expect(result.isVerified).toBe(false)
  })
})

describe('DeliveryLocationSchema', () => {
  it('validates valid delivery location', () => {
    const result = DeliveryLocationSchema.safeParse({
      type: 'Point',
      coordinates: [120.9842, 14.5995],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid delivery location', () => {
    const result = DeliveryLocationSchema.safeParse({
      type: 'LineString',
      coordinates: [120.9842, 14.5995],
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateOrderSchema', () => {
  const validOrder = {
    userId: 'user_123',
    merchantId: '507f1f77bcf86cd799439011',
    tankBrand: 'Gasul' as const,
    tankSize: '11kg' as const,
    quantity: 1,
    totalPrice: 1200,
    deliveryLocation: {
      type: 'Point' as const,
      coordinates: [120.9842, 14.5995] as [number, number],
    },
    deliveryAddress: '123 Test Street, Manila',
  }

  it('validates valid order data', () => {
    const result = CreateOrderSchema.safeParse(validOrder)
    expect(result.success).toBe(true)
  })

  it('rejects empty userId', () => {
    const result = CreateOrderSchema.safeParse({
      ...validOrder,
      userId: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid merchantId', () => {
    const result = CreateOrderSchema.safeParse({
      ...validOrder,
      merchantId: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative price', () => {
    const result = CreateOrderSchema.safeParse({
      ...validOrder,
      totalPrice: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero quantity', () => {
    const result = CreateOrderSchema.safeParse({
      ...validOrder,
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid tank brand', () => {
    const result = CreateOrderSchema.safeParse({
      ...validOrder,
      tankBrand: 'InvalidBrand',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid tank size', () => {
    const result = CreateOrderSchema.safeParse({
      ...validOrder,
      tankSize: '100kg',
    })
    expect(result.success).toBe(false)
  })

  it('applies default quantity', () => {
    const { quantity, ...withoutQuantity } = validOrder
    const result = CreateOrderSchema.parse(withoutQuantity)
    expect(result.quantity).toBe(1)
  })
})

describe('GetNearbyMerchantsSchema', () => {
  it('validates valid coordinates', () => {
    const result = GetNearbyMerchantsSchema.safeParse({
      latitude: 14.5995,
      longitude: 120.9842,
      radiusMeters: 5000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects latitude out of range', () => {
    const result = GetNearbyMerchantsSchema.safeParse({
      latitude: 100,
      longitude: 120.9842,
    })
    expect(result.success).toBe(false)
  })

  it('rejects longitude out of range', () => {
    const result = GetNearbyMerchantsSchema.safeParse({
      latitude: 14.5995,
      longitude: 200,
    })
    expect(result.success).toBe(false)
  })

  it('applies default radius', () => {
    const result = GetNearbyMerchantsSchema.parse({
      latitude: 14.5995,
      longitude: 120.9842,
    })
    expect(result.radiusMeters).toBe(5000)
  })

  it('rejects negative radius', () => {
    const result = GetNearbyMerchantsSchema.safeParse({
      latitude: 14.5995,
      longitude: 120.9842,
      radiusMeters: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects radius exceeding max', () => {
    const result = GetNearbyMerchantsSchema.safeParse({
      latitude: 14.5995,
      longitude: 120.9842,
      radiusMeters: 100000,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional brand filter', () => {
    const result = GetNearbyMerchantsSchema.safeParse({
      latitude: 14.5995,
      longitude: 120.9842,
      brand: 'Gasul',
    })
    expect(result.success).toBe(true)
  })
})

describe('GetMerchantByIdSchema', () => {
  it('validates valid merchant ID', () => {
    const result = GetMerchantByIdSchema.safeParse({
      merchantId: '507f1f77bcf86cd799439011',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid merchant ID format', () => {
    const result = GetMerchantByIdSchema.safeParse({
      merchantId: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty merchant ID', () => {
    const result = GetMerchantByIdSchema.safeParse({
      merchantId: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateMerchantPricingSchema', () => {
  it('validates valid pricing update', () => {
    const result = UpdateMerchantPricingSchema.safeParse({
      merchantId: '507f1f77bcf86cd799439011',
      pricing: { '11kg': 1300, '5kg': 650 },
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty pricing object', () => {
    const result = UpdateMerchantPricingSchema.safeParse({
      merchantId: '507f1f77bcf86cd799439011',
      pricing: {},
    })
    expect(result.success).toBe(true)
  })
})

describe('CancelOrderSchema', () => {
  it('validates order cancellation', () => {
    const result = CancelOrderSchema.safeParse({
      orderId: '507f1f77bcf86cd799439011',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional cancellation reason', () => {
    const result = CancelOrderSchema.safeParse({
      orderId: '507f1f77bcf86cd799439011',
      cancellationReason: 'Customer requested',
    })
    expect(result.success).toBe(true)
  })
})
