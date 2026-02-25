import TrustBadge from '@/components/TrustBadge'
import { getNearbyMerchants } from '@/server/merchants.functions'
import { useEffect, useState, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, MapPin, Filter, Phone } from 'lucide-react'

export const Route = createFileRoute('/merchants')({
  component: MerchantsList,
})


function MerchantsList() {
  const [merchants, setMerchants] = useState<any[]>([])
  const [_loading, setLoading] = useState(true)
  const [userCoords, setUserCoords] = useState<[number, number]>([120.9842, 14.5995])

  const fetchMerchants = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getNearbyMerchants({
        data: {
          latitude: userCoords[1],
          longitude: userCoords[0],
          radiusMeters: 10000,
        }
      })
      setMerchants(result)
    } catch {
      console.error('Failed to fetch merchants')
    } finally {
      setLoading(false)
    }
  }, [userCoords])

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords([pos.coords.longitude, pos.coords.latitude])
      })
    }
  }, [])

  useEffect(() => {
    fetchMerchants()
  }, [fetchMerchants])

  const openMerchants = merchants.filter(m => m.isOpen)
  const closedMerchants = merchants.filter(m => !m.isOpen)

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
                {openMerchants.map((merchant) => (
                  <div
                    key={merchant._id}
                    className="glass-card rounded-xl p-5 hover-scale animate-fade-in group cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{merchant.shopName}</h3>
                          <TrustBadge isVerified={merchant.isVerified} />
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{merchant.address || 'Address not listed'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1 text-green-400">
                            <Clock size={14} />
                            Open
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            Nearby
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
                {closedMerchants.map((merchant) => (
                  <div
                    key={merchant._id}
                    className="glass-card rounded-xl p-5 opacity-60 hover-scale animate-fade-in"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{merchant.shopName}</h3>
                          <TrustBadge isVerified={merchant.isVerified} />
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{merchant.address || 'Address not listed'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1 text-red-400">
                            <Clock size={14} />
                            Closed
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            Nearby
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
