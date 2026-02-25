import { z } from 'zod'

const objectIdRegex = /^[a-fA-F0-9]{24}$/

const coordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90)
])

export const GeoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: coordinateSchema,
})

export const MerchantSchema = z.object({
  shopName: z.string().min(1).max(200),
  doePermitNumber: z.string().min(1).max(100),
  location: GeoPointSchema,
  brandsAccepted: z.array(z.string()).default([]),
  pricing: z.record(z.string(), z.number()).default({}),
  deliveryPolygon: z.any().optional(),
  isOpen: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  baranggay: z.string().optional(),
  city: z.string().optional(),
  tankSizes: z.array(z.string()).default([]),
  deliveryRadiusMeters: z.number().default(5000),
})

export const DeliveryLocationSchema = z.object({
  type: z.literal('Point'),
  coordinates: coordinateSchema,
})

export const CreateOrderSchema = z.object({
  merchantId: z.string().regex(objectIdRegex, 'Invalid merchant ID format'),
  tankBrand: z.enum(['Gasul', 'Solane', 'Petron', 'other']),
  tankSize: z.enum(['2.7kg', '5kg', '11kg', '22kg', '50kg']),
  quantity: z.number().int().positive().default(1),
  totalPrice: z.number().positive(),
  deliveryLocation: DeliveryLocationSchema,
  deliveryAddress: z.string().min(1),
  notes: z.string().optional(),
})

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().regex(objectIdRegex, 'Invalid order ID format'),
  status: z.enum(['accepted', 'dispatched', 'in_transit', 'delivered', 'cancelled']),
  riderId: z.string().optional(),
  cancellationReason: z.string().optional(),
})

export const CancelOrderSchema = z.object({
  orderId: z.string().regex(objectIdRegex, 'Invalid order ID format'),
  cancellationReason: z.string().optional(),
})

export const GetNearbyMerchantsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().positive().max(50000).default(5000),
  brand: z.string().optional(),
})

export const GetMerchantByIdSchema = z.object({
  merchantId: z.string().regex(objectIdRegex, 'Invalid merchant ID format'),
})

export const UpdateMerchantPricingSchema = z.object({
  merchantId: z.string().regex(objectIdRegex, 'Invalid merchant ID format'),
  pricing: z.record(z.string(), z.number()),
})

export const GetMerchantsInPolygonSchema = z.object({
  polygon: z.array(z.array(z.number())).min(3),
})

// Rider schemas
export const GetPendingOrdersSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().positive().max(50000).default(10000),
})

export const AcceptOrderSchema = z.object({
  orderId: z.string().regex(objectIdRegex, 'Invalid order ID format'),
})

// Analytics schemas
export const GetOrderAnalyticsSchema = z.object({
  merchantId: z.string().regex(objectIdRegex, 'Invalid merchant ID format'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Inventory schemas
export const UpdateInventorySchema = z.object({
  merchantId: z.string().regex(objectIdRegex, 'Invalid merchant ID format'),
  tankSizes: z.array(z.string()),
  brandsAccepted: z.array(z.string()),
})

// User address schemas
export const SaveAddressSchema = z.object({
  label: z.enum(['home', 'office', 'other']),
  coordinates: coordinateSchema,
  address: z.string().min(1),
  baranggay: z.string().optional(),
  city: z.string().optional(),
  isDefault: z.boolean().default(false),
})
