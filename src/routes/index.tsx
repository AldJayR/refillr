import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
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
import TrustBadge from '@/components/TrustBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getNearbyMerchants } from '@/server/merchants.functions'
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
  loader: ({ deps }) =>
    getNearbyMerchants({
      data: { latitude: deps.lat, longitude: deps.lng, radiusMeters: 5000 },
    }),
  component: Dashboard,
})

function Dashboard() {
  const merchants = Route.useLoaderData()
  const { lat, lng } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null)

  useGeolocation({
    currentLat: lat,
    currentLng: lng,
    onLocationDetected: (newLat, newLng) => {
      navigate({ search: { lat: newLat, lng: newLng } })
    },
  })

  const mapMarkers = merchants.map((m: any) => ({
    id: m._id,
    coordinates: m.location.coordinates,
    shopName: m.shopName,
    isVerified: m.isVerified,
    isOpen: m.isOpen
  }))

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative h-[60vh]">
        <Map
          markers={mapMarkers}
          onMarkerClick={(id) => setSelectedMerchant(id)}
        />

        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="max-w-md mx-auto">
            <CommandMenu
              onSelect={(result) => console.log('Selected:', result)}
            />
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
          {merchants.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No dealers found in your area.</div>
          ) : merchants.map((merchant: any) => (
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
