import { connectToDatabase } from '@/lib/db.server'
import { MerchantModel } from '@/models/Merchant.server'
import { Types } from 'mongoose'
import { OrderModel } from '@/models/Order.server'

export async function handleGetNearbyMerchants({ data }: { data: { latitude: number; longitude: number; radiusMeters: number; brand?: string } }) {
  try {
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
  } catch (error) {
    console.error('[getNearbyMerchants]', error)
    throw new Error('Failed to fetch nearby merchants')
  }
}

export async function handleGetMerchantById({ data }: { data: { merchantId?: string } }) {
  try {
    if (!data?.merchantId) return null
    await connectToDatabase()

    const merchant = await MerchantModel.findById(data.merchantId).lean()

    if (!merchant) return null

    return {
      ...merchant,
      _id: merchant._id.toString(),
    }
  } catch (error) {
    console.error('[getMerchantById]', error)
    throw new Error('Failed to fetch merchant')
  }
}

export async function handleGetMyMerchant({ context }: { context: { userId: string } }) {
  try {
    await connectToDatabase()

    const merchant = await MerchantModel.findOne({ ownerUserId: context.userId }).lean()

    if (!merchant) return null

    return {
      ...merchant,
      _id: merchant._id.toString(),
    }
  } catch (error) {
    console.error('[getMyMerchant]', error)
    throw new Error('Failed to fetch merchant profile')
  }
}

export async function handleCreateMerchant({ data, context }: { data: any; context: { userId: string } }) {
  try {
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
  } catch (error) {
    console.error('[createMerchant]', error)
    throw new Error('Failed to create merchant profile')
  }
}

export async function handleUpdateMerchantPricing({ data }: { data: { merchantId: string; pricing: Record<string, number> } }) {
  try {
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
  } catch (error) {
    console.error('[updateMerchantPricing]', error)
    throw new Error('Failed to update merchant pricing')
  }
}

export async function handleGetMerchantsInPolygon({ data }: { data: { polygon: number[][][] } }) {
  try {
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
  } catch (error) {
    console.error('[getMerchantsInPolygon]', error)
    throw new Error('Failed to fetch merchants in polygon')
  }
}

export async function handleGetOrderAnalytics({ data }: { data: { merchantId: string; startDate?: string; endDate?: string; polygon?: number[][][] } }) {
  try {
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
    if (data.polygon && data.polygon.length >= 1) {
      const coordinates = data.polygon[0]
      query['deliveryLocation'] = {
        $geoWithin: {
          $polygon: coordinates,
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
  } catch (error) {
    console.error('[getOrderAnalytics]', error)
    throw new Error('Failed to fetch order analytics')
  }
}

export async function handleUpdateInventory({ data }: { data: { merchantId: string; tankSizes: string[]; brandsAccepted: string[] } }) {
  try {
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
  } catch (error) {
    console.error('[updateInventory]', error)
    throw new Error('Failed to update merchant inventory')
  }
}
