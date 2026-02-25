import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapProps {
  center?: [number, number]
  zoom?: number
  markers?: MerchantMarker[]
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

const DEFAULT_CENTER: [number, number] = [120.9842, 14.5995]
const DEFAULT_ZOOM = 13

export default function Map({ 
  center = DEFAULT_CENTER, 
  zoom = DEFAULT_ZOOM,
  markers = [],
  onMarkerClick,
  onMapClick
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.MAPBOX_ACCESS_TOKEN

    if (!accessToken) {
      console.warn('Mapbox access token not found. Map may not load properly.')
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
    }))

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick([e.lngLat.lng, e.lngLat.lat])
      })
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

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
      
      if (onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(markerData.id))
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat(markerData.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold text-slate-900">${markerData.shopName}</h3>
                <p class="text-sm text-slate-600">${markerData.isOpen ? 'Open' : 'Closed'}</p>
                ${markerData.isVerified ? '<span class="text-xs text-green-600 font-medium">DOE Verified</span>' : ''}
              </div>
            `)
        )
        .addTo(map.current!)

      markersRef.current.push(marker)
    })
  }, [markers, mapLoaded, onMarkerClick])

  return (
    <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
  )
}
