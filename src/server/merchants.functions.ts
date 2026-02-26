import { createServerFn } from '@tanstack/react-start'
import { connectToDatabase } from '@/lib/db.server'
import { MerchantModel } from '@/models/Merchant.server'
import {
  GetNearbyMerchantsSchema,
  GetMerchantByIdSchema,
  MerchantSchema,
  UpdateMerchantPricingSchema,
  GetMerchantsInPolygonSchema,
  GetOrderAnalyticsSchema,
  UpdateInventorySchema
} from '@/lib/schemas'
import { Types } from 'mongoose'
import { OrderModel } from '@/models/Order.server'
import { requireAuthMiddleware } from './middleware'

export const getNearbyMerchants = createServerFn({ method: 'GET' })
  .inputValidator(GetNearbyMerchantsSchema)
  .handler(async ({ data }) => {
    await connectToDatabase()

    const { latitude, longitude, radiusMeters, brand } = data

    const query: Record<string, unknown> = {
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusMeters
        }
      }
    }

    if (brand) {
      query.brandsAccepted = brand
    }

    const merchants = await MerchantModel.find(query).limit(20).lean()

    return merchants.map(merchant => ({
      ...merchant,
      _id: merchant._id.toString(),
    }))
  })

export const getMerchantById = createServerFn({ method: 'GET' })
  .inputValidator(GetMerchantByIdSchema)
  .handler(async ({ data }) => {
    if (!data?.merchantId) return null
    await connectToDatabase()

    const merchant = await MerchantModel.findById(data.merchantId).lean()

    if (!merchant) return null

    return {
      ...merchant,
      _id: merchant._id.toString(),
    }
  })

/**
 * Get the current user's merchant profile.
 * Returns null if the user hasn't registered as a merchant yet.
 */
export const getMyMerchant = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    await connectToDatabase()

    const merchant = await MerchantModel.findOne({ ownerUserId: context.userId }).lean()

    if (!merchant) return null

    return {
      ...merchant,
      _id: merchant._id.toString(),
    }
  })

export const createMerchant = createServerFn({ method: 'POST' })
  .inputValidator(MerchantSchema)
  .middleware([requireAuthMiddleware])
  .handler(async ({ data, context }) => {
    await connectToDatabase()

    // Check if user already has a merchant profile
    const existing = await MerchantModel.findOne({ ownerUserId: context.userId })
    if (existing) {
      throw new Error('You already have a merchant profile')
    }

    const merchant = await MerchantModel.create({
      ...data,
      ownerUserId: context.userId,
    })
    return merchant._id.toString()
  })

export const updateMerchantPricing = createServerFn({ method: 'POST' })
  .inputValidator(UpdateMerchantPricingSchema)
  .middleware([requireAuthMiddleware])
  .handler(async ({ data }) => {
    await connectToDatabase()

    const result = await MerchantModel.findByIdAndUpdate(
      data.merchantId,
      {
        $set: {
          pricing: data.pricing,
          updatedAt: new Date()
        }
      },
      { new: true }
    )

    return result !== null
  })

export const getMerchantsInPolygon = createServerFn({ method: 'GET' })
  .inputValidator(GetMerchantsInPolygonSchema)
  .handler(async ({ data }) => {
    await connectToDatabase()

    const { polygon } = data
    const coordinates = polygon[0]

    const merchants = await MerchantModel.find({
      location: {
        $geoWithin: {
          $polygon: coordinates
        }
      }
    }).lean()

    return merchants.map(merchant => ({
      ...merchant,
      _id: merchant._id.toString(),
    }))
  })

/**
 * Get order analytics for a specific merchant.
 * Returns total orders, revenue, and breakdown by brand/size.
 */
export const getOrderAnalytics = createServerFn({ method: 'GET' })
  .inputValidator(GetOrderAnalyticsSchema)
  .middleware([requireAuthMiddleware])
  .handler(async ({ data }) => {
    await connectToDatabase()

    const query: Record<string, unknown> = {
      merchantId: new Types.ObjectId(data.merchantId),
    }

    if (data.startDate || data.endDate) {
      const dateFilter: Record<string, Date> = {}
      if (data.startDate) dateFilter.$gte = new Date(data.startDate)
      if (data.endDate) dateFilter.$lte = new Date(data.endDate)
      query.createdAt = dateFilter
    }

    // Geofencing: filter orders whose deliveryLocation falls within the polygon
    if (data.polygon && data.polygon.length >= 3) {
      query['deliveryLocation'] = {
        $geoWithin: {
          $polygon: data.polygon,
        },
      }
    }

    const orders = await OrderModel.find(query).lean()

    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length

    // Breakdown by brand
    const byBrand: Record<string, { count: number; revenue: number }> = {}
    for (const order of orders) {
      const brand = order.tankBrand || 'unknown'
      if (!byBrand[brand]) byBrand[brand] = { count: 0, revenue: 0 }
      byBrand[brand].count++
      byBrand[brand].revenue += order.totalPrice || 0
    }

    // Breakdown by size
    const bySize: Record<string, { count: number; revenue: number }> = {}
    for (const order of orders) {
      const size = order.tankSize || 'unknown'
      if (!bySize[size]) bySize[size] = { count: 0, revenue: 0 }
      bySize[size].count++
      bySize[size].revenue += order.totalPrice || 0
    }

    return {
      totalOrders,
      totalRevenue,
      deliveredOrders,
      cancelledOrders,
      byBrand,
      bySize,
    }
  })

/**
 * Update merchant inventory (available tank sizes and brands).
 */
export const updateInventory = createServerFn({ method: 'POST' })
  .inputValidator(UpdateInventorySchema)
  .middleware([requireAuthMiddleware])
  .handler(async ({ data }) => {
    await connectToDatabase()

    const result = await MerchantModel.findByIdAndUpdate(
      data.merchantId,
      {
        $set: {
          tankSizes: data.tankSizes,
          brandsAccepted: data.brandsAccepted,
          updatedAt: new Date(),
        }
      },
      { new: true }
    )

    return result !== null
  })
