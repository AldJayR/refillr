import { createServerFn } from '@tanstack/react-start'
import {
  GetNearbyMerchantsSchema,
  GetMerchantByIdSchema,
  MerchantSchema,
  UpdateMerchantPricingSchema,
  GetMerchantsInPolygonSchema,
  GetOrderAnalyticsSchema,
  UpdateInventorySchema
} from '@/lib/schemas'
import { requireAuthMiddleware, requireMerchantOwnership } from './middleware'
import {
  handleGetNearbyMerchants,
  handleGetMerchantById,
  handleGetMyMerchant,
  handleCreateMerchant,
  handleUpdateMerchantPricing,
  handleGetMerchantsInPolygon,
  handleGetOrderAnalytics,
  handleUpdateInventory,
} from './merchants.handlers'

export const getNearbyMerchants = createServerFn({ method: 'GET' })
  .inputValidator(GetNearbyMerchantsSchema)
  .handler(async (args) => handleGetNearbyMerchants(args))

export const getMerchantById = createServerFn({ method: 'GET' })
  .inputValidator(GetMerchantByIdSchema)
  .handler(async (args) => handleGetMerchantById(args))

/**
 * Get the current user's merchant profile.
 * Returns null if the user hasn't registered as a merchant yet.
 */
export const getMyMerchant = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async (args) => handleGetMyMerchant(args))

export const createMerchant = createServerFn({ method: 'POST' })
  .inputValidator(MerchantSchema)
  .middleware([requireAuthMiddleware])
  .handler(async (args) => handleCreateMerchant(args))

export const updateMerchantPricing = createServerFn({ method: 'POST' })
  .inputValidator(UpdateMerchantPricingSchema)
  .middleware([requireMerchantOwnership])
  .handler(async (args) => handleUpdateMerchantPricing(args))

export const getMerchantsInPolygon = createServerFn({ method: 'GET' })
  .inputValidator(GetMerchantsInPolygonSchema)
  .handler(async (args) => handleGetMerchantsInPolygon(args))

/**
 * Get order analytics for a specific merchant.
 * Returns total orders, revenue, and breakdown by brand/size.
 */
export const getOrderAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(GetOrderAnalyticsSchema)
  .middleware([requireMerchantOwnership])
  .handler(async (args) => handleGetOrderAnalytics(args))

/**
 * Update merchant inventory (available tank sizes and brands).
 */
export const updateInventory = createServerFn({ method: 'POST' })
  .inputValidator(UpdateInventorySchema)
  .middleware([requireMerchantOwnership])
  .handler(async (args) => handleUpdateInventory(args))
