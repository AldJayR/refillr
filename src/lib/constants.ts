/**
 * Default location: Manila, Philippines (GeoJSON order: [lng, lat])
 */
export const DEFAULT_LOCATION = { lat: 14.5995, lng: 120.9842 } as const

/**
 * Default search radius for nearby merchants/riders (customer-facing).
 */
export const DEFAULT_SEARCH_RADIUS_METERS = 5000

/**
 * Extended search radius for rider dispatch and merchant overviews.
 */
export const EXTENDED_SEARCH_RADIUS_METERS = 10000

/**
 * LPG brands accepted on the platform.
 */
export const TANK_BRANDS = ['Gasul', 'Solane', 'Petron'] as const

/**
 * LPG tank sizes available on the platform.
 */
export const TANK_SIZES = ['2.7kg', '5kg', '11kg', '22kg', '50kg'] as const

export type TankBrand = (typeof TANK_BRANDS)[number]
export type TankSize = (typeof TANK_SIZES)[number]
