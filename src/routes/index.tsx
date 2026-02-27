import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Flame,
  MapPin,
  Plus,
  X
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
import { DEFAULT_LOCATION } from '@/lib/constants'
import { toast } from 'sonner'

const searchSchema = z.object({
  lat: z.number().optional().default(DEFAULT_LOCATION.lat),
  lng: z.number().optional().default(DEFAULT_LOCATION.lng),
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
    onError: () => {
      toast.info('Location unavailable — showing results near Cabanatuan City', {
        id: 'gps-denied',
      })
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
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Background glow */}
      <div className="absolute top-36 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      {/* Hero Section */}
      <div className="mt-16 pt-4 pb-16 md:pt-16 md:pb-24 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="animate-hero-fade-in hero-delay-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/60 text-primary text-sm mb-6">
            <Flame size={14} />
            <span>Fastest LPG Delivery in Nueva Ecija</span>
          </div>

          <h1 className="animate-hero-fade-in hero-delay-1 text-5xl md:text-7xl font-bold font-heading text-foreground mb-6 tracking-tight">
            Never run out of gas <br className="hidden md:block" />
            <span className="text-gradient">mid-cooking again.</span>
          </h1>
          
          <p className="animate-hero-fade-in hero-delay-2 text-lg md:text-xl text-muted-foreground mb-10 max-w-prose mx-auto">
            Order verified Gasul, Solane, and Petron refills from trusted local dealers. Delivered to your door in minutes.
          </p>

          <div className="animate-hero-fade-in hero-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/order/new">
                <Plus />
                Order Refill Now
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/merchants">
                View Local Dealers
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 pb-24 grid lg:grid-cols-[1fr_400px] gap-8">
        
        {/* Left Column: Map & Search */}
        <div className="space-y-6 flex flex-col h-150 lg:h-auto min-h-125">
          <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-black/50">
            <Map
              markers={mapMarkers}
              riderMarkers={riderMarkers}
              onMarkerClick={(id) => setSelectedMerchant(id)}
            />
            
            {/* Floating Search Bar */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="max-w-md mx-auto">
                <CommandMenu
                  onSelect={(result) => setActiveFilter(result)}
                  className="shadow-2xl"
                />
                {activeFilter && (
                  <div className="mt-2 animate-fade-in">
                    <span className="text-xs bg-slate-900/90 backdrop-blur-md text-orange-400 border border-orange-500/30 rounded-full px-3 py-1.5 inline-flex items-center gap-1 shadow-lg">
                      {activeFilter.label}
                      <span className="text-slate-600 mx-1">·</span>
                      <span className="text-slate-300">{filteredMerchants.length} result{filteredMerchants.length !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => setActiveFilter(null)}
                        className="ml-2 text-slate-400 hover:text-white transition-colors"
                        aria-label="Clear filter"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dealers List */}
        <div className="flex flex-col h-150 lg:h-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="text-primary" size={16} />
              Nearby Dealers
            </h2>
            <span className="text-sm text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
              {filteredMerchants.length} found
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {filteredMerchants.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="text-slate-500" size={24} />
                </div>
                <p className="text-slate-400 font-medium">
                  {activeFilter ? `No dealers carry ${activeFilter.label} nearby.` : 'No dealers found in your area.'}
                </p>
                {activeFilter && (
                  <Button 
                    variant="link" 
                    onClick={() => setActiveFilter(null)}
                    className="text-orange-500 mt-2"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : filteredMerchants.map((merchant) => (
              <div
                key={merchant._id}
                className={cn(
                  "glass-card rounded-xl p-5 transition-all cursor-pointer group",
                  selectedMerchant === merchant._id 
                    ? "border-orange-500 bg-orange-500/5 shadow-[0_0_30px_-10px_rgba(249,115,22,0.2)]" 
                    : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/30"
                )}
                onClick={() => setSelectedMerchant(merchant._id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg group-hover:text-orange-400 transition-colors">
                      {merchant.shopName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400">
                      <span className={cn(
                        "flex items-center gap-1.5 font-medium",
                        merchant.isOpen ? "text-emerald-400" : "text-rose-400"
                      )}>
                        <span className={cn("w-2 h-2 rounded-full", merchant.isOpen ? "bg-emerald-400" : "bg-rose-400")} />
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
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {merchant.brandsAccepted?.map((brand: string) => (
                    <span
                      key={brand}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs font-medium text-slate-300"
                    >
                      {brand}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/50">
                  <TrustBadge isVerified={merchant.isVerified} showLabel />
                  <TrustBadge
                    isVerified={Object.keys(merchant.pricing || {}).length > 0}
                    variant="fair-price"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
