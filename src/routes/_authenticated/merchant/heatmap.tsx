import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getMerchantOrders } from '@/server/orders.functions'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const DEFAULT_CENTER: [number, number] = [120.9842, 14.5995]

export const Route = createFileRoute('/_authenticated/merchant/heatmap')({
  loader: ({ context }) => {
    const merchantId = (context as any).merchantId as string
    return getMerchantOrders({ data: { merchantId } })
  },
  component: DemandHeatmap,
})

function ordersToGeoJSON(orders: any[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: orders
      .filter((o) => o.deliveryLocation?.coordinates)
      .map((order) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: order.deliveryLocation.coordinates,
        },
        properties: {
          status: order.status,
          totalPrice: order.totalPrice,
        },
      })),
  }
}

function DemandHeatmap() {
  const orders = Route.useLoaderData()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const accessToken =
      import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
      import.meta.env.MAPBOX_ACCESS_TOKEN
    mapboxgl.accessToken = accessToken || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DEFAULT_CENTER,
      zoom: 12,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const geojson = ordersToGeoJSON(orders)

    // Remove existing source/layer if re-rendering
    if (map.current.getSource('orders-heat')) {
      map.current.removeLayer('orders-heat-layer')
      map.current.removeSource('orders-heat')
    }

    map.current.addSource('orders-heat', {
      type: 'geojson',
      data: geojson,
    })

    map.current.addLayer({
      id: 'orders-heat-layer',
      type: 'heatmap',
      source: 'orders-heat',
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'totalPrice'], 0, 0, 5000, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 13, 3],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 13, 20],
        'heatmap-opacity': 0.8,
      },
    })
  }, [orders, mapLoaded])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Demand Heatmap</h1>
        <p className="text-sm text-slate-400 mt-1">
          Visualize where your orders are concentrated. Warmer colors = higher demand.
        </p>
      </div>

      <div
        className="rounded-xl overflow-hidden border border-slate-800"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>Orders shown: {orders.length}</span>
        <div className="flex items-center gap-2">
          <span>Low</span>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="w-6" style={{ background: 'rgb(103,169,207)' }} />
            <div className="w-6" style={{ background: 'rgb(209,229,240)' }} />
            <div className="w-6" style={{ background: 'rgb(253,219,199)' }} />
            <div className="w-6" style={{ background: 'rgb(239,138,98)' }} />
            <div className="w-6" style={{ background: 'rgb(178,24,43)' }} />
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}
