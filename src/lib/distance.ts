import { distance, point } from '@turf/turf'

/**
 * Calculate the distance between a user's location and a merchant's GeoJSON coordinates.
 * @param userLat  User latitude
 * @param userLng  User longitude
 * @param merchantCoords  [longitude, latitude] (GeoJSON order)
 * @returns Human-readable distance string, e.g. "450m" or "1.2km"
 */
export function formatDistance(
  userLat: number,
  userLng: number,
  merchantCoords: [number, number],
): string {
  const from = point([userLng, userLat])
  const to = point(merchantCoords)
  const km = distance(from, to, { units: 'kilometers' })

  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}
