import { useEffect } from 'react'

interface UseGeolocationOptions {
  /** Current lat from search params */
  currentLat: number
  /** Current lng from search params */
  currentLng: number
  /** Callback to update coordinates (typically navigate with new search params) */
  onLocationDetected: (lat: number, lng: number) => void
  /** Minimum delta to trigger update (default 0.001 ~ 111m) */
  threshold?: number
}

/**
 * Detects the user's geolocation once on mount and calls onLocationDetected
 * if the position differs from the current coords by more than `threshold`.
 */
export function useGeolocation({
  currentLat,
  currentLng,
  onLocationDetected,
  threshold = 0.001,
}: UseGeolocationOptions) {
  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude
        const newLng = pos.coords.longitude
        if (
          Math.abs(newLat - currentLat) > threshold ||
          Math.abs(newLng - currentLng) > threshold
        ) {
          onLocationDetected(newLat, newLng)
        }
      },
      () => {
        // Geolocation denied or unavailable — stay on defaults
      },
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
