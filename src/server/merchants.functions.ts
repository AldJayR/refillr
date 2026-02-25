import { createServerFn } from '@tanstack/react-start'
import { connectToDatabase } from '@/lib/db.server'
import { MerchantModel } from '@/models/Merchant.server'
import { 
  GetNearbyMerchantsSchema, 
  GetMerchantByIdSchema,
  MerchantSchema,
  UpdateMerchantPricingSchema,
  GetMerchantsInPolygonSchema 
} from '@/lib/schemas'
import { Types } from 'mongoose'
import { z } from 'zod'

const validator = <T>(schema: z.ZodSchema<T>, allowOptional = false) => {
  return (data: unknown): T | undefined => {
    if (allowOptional && (data === undefined || data === null)) {
      return undefined
    }
    const result = schema.safeParse(data)
    if (!result.success) {
      return undefined
    }
    return result.data
  }
}

export const getNearbyMerchants = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const parsed = validator(GetNearbyMerchantsSchema)(data)
    if (!parsed) return []
    
    await connectToDatabase()
    
    const { latitude, longitude, radiusMeters, brand } = parsed
    
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
      _id: (merchant._id as Types.ObjectId).toString()
    }))
  })

export const getMerchantById = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const parsed = validator(GetMerchantByIdSchema, true)(data)
    if (!parsed) return null
    
    await connectToDatabase()
    
    const merchant = await MerchantModel.findById(parsed.merchantId).lean()
    
    if (!merchant) return null

    return {
      ...merchant,
      _id: (merchant._id as Types.ObjectId).toString()
    }
  })

export const createMerchant = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const parsed = validator(MerchantSchema)(data)
    if (!parsed) return null
    
    await connectToDatabase()
    
    const merchant = await MerchantModel.create(parsed)
    return merchant._id.toString()
  })

export const updateMerchantPricing = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    const parsed = validator(UpdateMerchantPricingSchema)(data)
    if (!parsed) return false
    
    await connectToDatabase()
    
    const result = await MerchantModel.findByIdAndUpdate(
      parsed.merchantId,
      { 
        $set: { 
          pricing: parsed.pricing,
          updatedAt: new Date()
        } 
      },
      { new: true }
    )

    return result !== null
  })

export const getMerchantsInPolygon = createServerFn({ method: 'GET' })
  .handler(async ({ data }) => {
    const parsed = validator(GetMerchantsInPolygonSchema)(data)
    if (!parsed) return []
    
    await connectToDatabase()
    
    const { polygon } = parsed
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
      _id: (merchant._id as Types.ObjectId).toString()
    }))
  })
