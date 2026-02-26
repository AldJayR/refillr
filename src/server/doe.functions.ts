import { createServerFn } from '@tanstack/react-start'
import { connectToDatabase } from '@/lib/db.server'
import { DOEConfigModel } from '@/models/DOEConfig.server'
import { requireAuthMiddleware } from './middleware'
import { env } from '@/lib/env.server'

/**
 * Get the current active DOE price configuration.
 * Returns the latest active price list, or null if none exists.
 */
export const getDOEPrices = createServerFn({ method: 'GET' })
  .handler(async () => {
    await connectToDatabase()

    const config = await DOEConfigModel.findOne({ isActive: true })
      .sort({ effectiveDate: -1 })
      .lean()

    if (!config) return null

    return {
      ...config,
      _id: config._id.toString(),
    }
  })

/**
 * Seed DOE prices for development.
 * Approximate PH DOE suggested retail prices (Feb 2026).
 * Only callable in development; requires authentication.
 */
export const seedDOEPrices = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    if (env.NODE_ENV !== 'development') {
      throw new Error('seedDOEPrices is only available in development')
    }

    await connectToDatabase()

    // Deactivate existing configs
    await DOEConfigModel.updateMany({}, { $set: { isActive: false } })

    const config = await DOEConfigModel.create({
      weekLabel: '2026-W09',
      effectiveDate: new Date('2026-02-23'),
      isActive: true,
      prices: [
        // Gasul
        { brand: 'Gasul', size: '2.7kg', suggestedRetailPrice: 190, maxRetailPrice: 210 },
        { brand: 'Gasul', size: '5kg', suggestedRetailPrice: 350, maxRetailPrice: 385 },
        { brand: 'Gasul', size: '11kg', suggestedRetailPrice: 770, maxRetailPrice: 850 },
        { brand: 'Gasul', size: '22kg', suggestedRetailPrice: 1540, maxRetailPrice: 1700 },
        { brand: 'Gasul', size: '50kg', suggestedRetailPrice: 3500, maxRetailPrice: 3850 },
        // Solane
        { brand: 'Solane', size: '2.7kg', suggestedRetailPrice: 195, maxRetailPrice: 215 },
        { brand: 'Solane', size: '5kg', suggestedRetailPrice: 360, maxRetailPrice: 395 },
        { brand: 'Solane', size: '11kg', suggestedRetailPrice: 790, maxRetailPrice: 870 },
        { brand: 'Solane', size: '22kg', suggestedRetailPrice: 1580, maxRetailPrice: 1740 },
        { brand: 'Solane', size: '50kg', suggestedRetailPrice: 3590, maxRetailPrice: 3950 },
        // Petron
        { brand: 'Petron', size: '2.7kg', suggestedRetailPrice: 185, maxRetailPrice: 205 },
        { brand: 'Petron', size: '5kg', suggestedRetailPrice: 340, maxRetailPrice: 375 },
        { brand: 'Petron', size: '11kg', suggestedRetailPrice: 750, maxRetailPrice: 830 },
        { brand: 'Petron', size: '22kg', suggestedRetailPrice: 1500, maxRetailPrice: 1660 },
        { brand: 'Petron', size: '50kg', suggestedRetailPrice: 3400, maxRetailPrice: 3750 },
      ],
    })

    return config._id.toString()
  })
