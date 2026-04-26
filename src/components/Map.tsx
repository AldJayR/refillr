import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { DEFAULT_LOCATION } from '@/lib/constants'
import { useTheme } from './ThemeProvider'

interface MapProps {
  center?: [number, number]
  zoom?: number
  markers?: MerchantMarker[]
  riderMarkers?: RiderMarker[]
  onMarkerClick?: (merchantId: string) => void
  onMapClick?: (coordinates: [number, number]) => void
}

interface MerchantMarker {
  id: string
  coordinates: [number, number]
  shopName: string
  isVerified: boolean
  isOpen: boolean
}

export interface RiderMarker {
  id: string
  coordinates: [number, number]
  name: string
}

const DEFAULT_CENTER: [number, number] = [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat]
const DEFAULT_ZOOM = 13

/** Escape HTML to prevent XSS when injecting user data into innerHTML */
function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

/** Build HTML for a merchant map popup. */
function buildMerchantPopupHtml(data: MerchantMarker, theme: string): string {
  const name = escapeHtml(data.shopName)
  const status = data.isOpen ? 'Open' : 'Closed'
  const verified = data.isVerified ? '<span class="text-xs text-green-600 font-medium">DOE Verified</span>' : ''
  const isDark = theme === 'dark'
  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const subColor = isDark ? '#94a3b8' : '#475569'

  return `
    <div class="p-2">
      <h3 class="font-semibold" style="color: ${textColor}">${name}</h3>
      <p class="text-sm" style="color: ${subColor}">${status}</p>
      ${verified}
    </div>
  `
}

/** Build HTML for a rider map popup. */
function buildRiderPopupHtml(data: RiderMarker, theme: string): string {
  const name = escapeHtml(data.name)
  const isDark = theme === 'dark'
  const textColor = isDark ? '#f8fafc' : '#0f172a'

  return `
    <div class="p-2">
      <h3 class="font-semibold" style="color: ${textColor}">Rider: ${name}</h3>
      <p class="text-xs text-green-600 font-medium">Active Now</p>
    </div>
  `
}

export default function Map({ 
  center = DEFAULT_CENTER, 
  zoom = DEFAULT_ZOOM,
  markers = [],
  riderMarkers = [],
  onMarkerClick,
  onMapClick
}: MapProps) {
  const { theme } = useTheme()
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const riderMarkersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Keep latest callbacks in refs to avoid stale closures
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  /**
   * REACT 19 MODERN PATTERN: Ref Callback with Cleanup
   * This replaces the need for a "mount" and "unmount" useEffect.
   */
  const mapContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return

    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
    if (!accessToken) console.warn('Mapbox access token not found.')
    mapboxgl.accessToken = accessToken || ''

    const m = new mapboxgl.Map({
      container: node,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: zoom,
      pitch: 45,
    })

    m.addControl(new mapboxgl.NavigationControl(), 'top-right')
    m.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showUserHeading: true,
    }))

    m.on('load', () => setMapLoaded(true))
    m.on('click', (e) => onMapClickRef.current?.([e.lngLat.lng, e.lngLat.lat]))

    mapRef.current = m

    // Return cleanup function (React 19)
    return () => {
      m.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, []) // Empty deps = init once per container lifecycle

  // 1. Reactive Style Updates (Theme changes)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    mapRef.current.setStyle(theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11')
  }, [theme, mapLoaded])

  // 2. Reactive Marker Updates (Data changes)
  useEffect(() => {
    const m = mapRef.current
    if (!m || !mapLoaded) return

    // Clear and Redraw Markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    riderMarkersRef.current.forEach(marker => marker.remove())
    riderMarkersRef.current = []

    markers.forEach((data) => {
      const el = document.createElement('div')
      el.className = 'merchant-marker'
      el.innerHTML = `<div class="marker-pin ${data.isVerified ? 'verified' : ''} ${data.isOpen ? 'open' : 'closed'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      </div>`
      el.style.cursor = 'pointer'
      el.addEventListener('click', () => onMarkerClickRef.current?.(data.id))

      const marker = new mapboxgl.Marker(el)
        .setLngLat(data.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(buildMerchantPopupHtml(data, theme)))
        .addTo(m)
      markersRef.current.push(marker)
    })

    riderMarkers.forEach((data) => {
      const el = document.createElement('div')
      el.className = 'rider-marker'
      el.innerHTML = `<div class="rider-marker-pin relative flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full shadow-lg border-2 border-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>
      </div>`

      const marker = new mapboxgl.Marker(el)
        .setLngLat(data.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(buildRiderPopupHtml(data, theme)))
        .addTo(m)
      riderMarkersRef.current.push(marker)
    })
  }, [markers, riderMarkers, mapLoaded, theme])

  return (
    <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
  )
}
