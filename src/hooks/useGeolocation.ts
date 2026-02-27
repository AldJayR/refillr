import { useEffect } from 'react'

interface UseGeolocationOptions {
  /** Current lat from search params */
  currentLat: number
  /** Current lng from search params */
  currentLng: number
  /** Callback to update coordinates (typically navigate with new search params) */
  onLocationDetected: (lat: number, lng: number) => void
  /** Called when geolocation is denied or unavailable */
  onError?: () => void
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
  onError,
  threshold = 0.001,
}: UseGeolocationOptions) {
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      onError?.()
      return
    }

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
        onError?.()
      },
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
