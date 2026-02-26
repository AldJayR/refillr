import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Flame,
  MapPin,
  Clock,
  Phone,
  Plus,
  ArrowRight
} from 'lucide-react'
import Map from '@/components/Map'
import CommandMenu from '@/components/CommandMenu'
import type { SearchResult } from '@/components/CommandMenu'
import TrustBadge from '@/components/TrustBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getNearbyMerchants } from '@/server/merchants.functions'
import { getNearbyRiders } from '@/server/rider.functions'
import { formatDistance } from '@/lib/distance'
import { useGeolocation } from '@/hooks/useGeolocation'
import { z } from 'zod'

const searchSchema = z.object({
  lat: z.number().optional().default(14.5995),
  lng: z.number().optional().default(120.9842),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ lat: search.lat, lng: search.lng }),
  loader: async ({ deps }) => {
    const [merchants, riders] = await Promise.all([
      getNearbyMerchants({
        data: { latitude: deps.lat, longitude: deps.lng, radiusMeters: 5000 },
      }),
      getNearbyRiders({
        data: { latitude: deps.lat, longitude: deps.lng, radiusMeters: 5000 },
      })
    ])
    return { merchants, riders }
  },
  component: Dashboard,
})

function Dashboard() {
  const { merchants, riders } = Route.useLoaderData()
  const { lat, lng } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<SearchResult | null>(null)

  useGeolocation({
    currentLat: lat,
    currentLng: lng,
    onLocationDetected: (newLat, newLng) => {
      navigate({ search: { lat: newLat, lng: newLng } })
    },
  })

  const filteredMerchants = useMemo(() => {
    if (!activeFilter) return merchants
    if (activeFilter.type === 'brand') {
      // Use structured fields when present; fall back to label parsing for backward compat
      const brand = (activeFilter.brandName ?? activeFilter.label.split(' ')[0]).toLowerCase()
      const size = activeFilter.sizeLabel?.toLowerCase()
      return merchants.filter((m) => {
        const hasBrand = m.brandsAccepted?.some((b: string) => b.toLowerCase() === brand)
        const hasSize = size ? m.tankSizes?.some((s: string) => s.toLowerCase() === size) : true
        return hasBrand && hasSize
      })
    }
    if (activeFilter.type === 'size') {
      const size = (activeFilter.sizeLabel ?? activeFilter.label).toLowerCase()
      return merchants.filter((m) =>
        m.tankSizes?.some((s: string) => s.toLowerCase() === size)
      )
    }
    // location filtering not yet implemented
    return merchants
  }, [merchants, activeFilter])

  const mapMarkers = useMemo(() => filteredMerchants.map((m) => ({
    id: m._id,
    coordinates: m.location.coordinates,
    shopName: m.shopName,
    isVerified: m.isVerified,
    isOpen: m.isOpen
  })), [filteredMerchants])

  const riderMarkers = useMemo(() => riders
    .filter((r) => r.lastLocation?.coordinates)
    .map((r) => ({
      id: r._id,
      coordinates: r.lastLocation!.coordinates,
      name: `${r.firstName} ${r.lastName}`
    })), [riders])

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative h-[60vh]">
        <Map
          markers={mapMarkers}
          riderMarkers={riderMarkers}
          onMarkerClick={(id) => setSelectedMerchant(id)}
        />

        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="max-w-md mx-auto">
            <CommandMenu
              onSelect={(result) => setActiveFilter(result)}
            />
            {activeFilter && (
              <div className="mt-2">
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-3 py-1 inline-flex items-center gap-1">
                  {activeFilter.label}
                  <span className="text-orange-300/70 mx-1">·</span>
                  {filteredMerchants.length} result{filteredMerchants.length !== 1 ? 's' : ''}
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="ml-1 hover:text-white"
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="text-orange-500" size={20} />
                <span className="text-white font-bold font-heading">Refillr</span>
              </div>
              <Link to="/order/new">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  <Plus size={16} />
                  New Order
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Nearby Dealers</h2>
          <Link to="/merchants" className="text-orange-500 text-sm flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-3">
          {filteredMerchants.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {activeFilter ? `No dealers carry ${activeFilter.label} in your area.` : 'No dealers found in your area.'}
            </div>
          ) : filteredMerchants.map((merchant) => (
            <div
              key={merchant._id}
              className={cn(
                "glass-card rounded-xl p-4 hover-scale cursor-pointer group",
                selectedMerchant === merchant._id ? "border-orange-500 ring-1 ring-orange-500/50" : "border-slate-800"
              )}
              onClick={() => setSelectedMerchant(merchant._id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{merchant.shopName}</h3>
                    <TrustBadge isVerified={merchant.isVerified} showLabel />
                    <TrustBadge
                      isVerified={Object.keys(merchant.pricing || {}).length > 0}
                      variant="fair-price"
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className={cn(
                      "flex items-center gap-1",
                      merchant.isOpen ? "text-green-400" : "text-red-400"
                    )}>
                      <Clock size={14} />
                      {merchant.isOpen ? 'Open' : 'Closed'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {merchant.location?.coordinates
                        ? formatDistance(lat, lng, merchant.location.coordinates)
                        : 'Nearby'}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-slate-700 hover:bg-slate-800">
                  <Phone size={14} />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {merchant.brandsAccepted?.map((brand: string) => (
                  <span
                    key={brand}
                    className="px-2 py-1 bg-slate-800 rounded-md text-xs text-slate-300"
                  >
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border-orange-500/20">
          <h3 className="font-bold font-heading text-white mb-2 flex items-center gap-2">
            <TrustBadge isVerified={true} />
            Safety First
          </h3>
          <p className="text-sm text-slate-400">
            Look for the <span className="text-green-400 font-medium">DOE Verified</span> badge to ensure you're getting safe, properly maintained gas tanks.
          </p>
        </div>
      </div>
    </div>
  )
}
