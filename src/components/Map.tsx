import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { DEFAULT_LOCATION } from '@/lib/constants'

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
function buildMerchantPopupHtml(data: MerchantMarker): string {
  const name = escapeHtml(data.shopName)
  const status = data.isOpen ? 'Open' : 'Closed'
  const verified = data.isVerified
    ? '<span class="text-xs text-green-600 font-medium">DOE Verified</span>'
    : ''
  return `
    <div class="p-2">
      <h3 class="font-semibold text-slate-900">${name}</h3>
      <p class="text-sm text-slate-600">${status}</p>
      ${verified}
    </div>
  `
}

/** Build HTML for a rider map popup. */
function buildRiderPopupHtml(data: RiderMarker): string {
  const name = escapeHtml(data.name)
  return `
    <div class="p-2">
      <h3 class="font-semibold text-slate-900">Rider: ${name}</h3>
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
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const riderMarkersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Keep latest callbacks in refs to avoid stale closures in the init effect
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  // Initialize map once — intentionally empty deps (map instance is long-lived)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

    if (!accessToken) {
      console.warn('Mapbox access token not found. Set VITE_MAPBOX_ACCESS_TOKEN in your .env file.')
    }

    mapboxgl.accessToken = accessToken || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: center,
      zoom: zoom,
      pitch: 45,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showUserHeading: true,
    }))

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    // Use ref to always call the latest onMapClick — avoids stale closure
    map.current.on('click', (e) => {
      onMapClickRef.current?.([e.lngLat.lng, e.lngLat.lat])
    })

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      riderMarkersRef.current.forEach(marker => marker.remove())
      riderMarkersRef.current = []
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Clear existing merchant markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    markers.forEach((markerData) => {
      const el = document.createElement('div')
      el.className = 'merchant-marker'
      
      const verifiedClass = markerData.isVerified ? 'verified' : ''
      const openClass = markerData.isOpen ? 'open' : 'closed'
      
      el.innerHTML = `
        <div class="marker-pin ${verifiedClass} ${openClass}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
      `

      el.style.cursor = 'pointer'
      
      // Use ref to always call the latest onMarkerClick
      el.addEventListener('click', () => onMarkerClickRef.current?.(markerData.id))

      const marker = new mapboxgl.Marker(el)
        .setLngLat(markerData.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(buildMerchantPopupHtml(markerData))
        )
        .addTo(map.current!)

      markersRef.current.push(marker)
    })

    // Clear existing rider markers
    riderMarkersRef.current.forEach(marker => marker.remove())
    riderMarkersRef.current = []

    riderMarkers.forEach((markerData) => {
      const el = document.createElement('div')
      el.className = 'rider-marker'
      
      el.innerHTML = `
        <div class="rider-marker-pin relative flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      `

      const marker = new mapboxgl.Marker(el)
        .setLngLat(markerData.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(buildRiderPopupHtml(markerData))
        )
        .addTo(map.current!)

      riderMarkersRef.current.push(marker)
    })
  }, [markers, riderMarkers, mapLoaded])

  return (
    <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
  )
}
