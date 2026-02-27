import TrustBadge from '@/components/TrustBadge'
import { getNearbyMerchants } from '@/server/merchants.functions'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, MapPin, Filter, Phone } from 'lucide-react'
import { formatDistance } from '@/lib/distance'
import { useGeolocation } from '@/hooks/useGeolocation'
import { z } from 'zod'
import { DEFAULT_LOCATION } from '@/lib/constants'
import { toast } from 'sonner'

const searchSchema = z.object({
  lat: z.number().optional().default(DEFAULT_LOCATION.lat),
  lng: z.number().optional().default(DEFAULT_LOCATION.lng),
})

export const Route = createFileRoute('/merchants')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ lat: search.lat, lng: search.lng }),
  loader: ({ deps }) =>
    getNearbyMerchants({
      data: { latitude: deps.lat, longitude: deps.lng, radiusMeters: 10000 },
    }),
  component: MerchantsList,
})

function MerchantsList() {
  const merchants = Route.useLoaderData()
  const { lat, lng } = Route.useSearch()
  const navigate = Route.useNavigate()

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

  const openMerchants = merchants.filter((m: any) => m.isOpen)
  const closedMerchants = merchants.filter((m: any) => !m.isOpen)

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">Nearby Merchants</h1>
          </div>
          <Button variant="outline" size="icon" className="border-slate-700">
            <Filter size={18} />
          </Button>
        </div>

        <div className="space-y-6">
          {openMerchants.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3">
                Open Now ({openMerchants.length})
              </h2>
              <div className="space-y-3">
                {openMerchants.map((merchant: any) => (
                  <div
                    key={merchant._id}
                    className="glass-card rounded-xl p-5 hover-scale animate-fade-in group cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{merchant.shopName}</h3>
                          <TrustBadge isVerified={merchant.isVerified} />
                          <TrustBadge
                            isVerified={Object.keys((merchant as any).pricing || {}).length > 0}
                            variant="fair-price"
                          />
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{merchant.address || 'Address not listed'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1 text-green-400">
                            <Clock size={14} />
                            Open
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {merchant.location?.coordinates
                              ? formatDistance(lat, lng, merchant.location.coordinates)
                              : 'Nearby'}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-slate-700">
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
            </div>
          )}

          {closedMerchants.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3">
                Closed ({closedMerchants.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {closedMerchants.map((merchant: any) => (
                  <div
                    key={merchant._id}
                    className="glass-card rounded-xl p-5 opacity-60 hover-scale animate-fade-in"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{merchant.shopName}</h3>
                          <TrustBadge isVerified={merchant.isVerified} />
                          <TrustBadge
                            isVerified={Object.keys((merchant as any).pricing || {}).length > 0}
                            variant="fair-price"
                          />
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{merchant.address || 'Address not listed'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1 text-red-400">
                            <Clock size={14} />
                            Closed
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
