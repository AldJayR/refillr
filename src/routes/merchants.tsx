import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import TrustBadge from '@/components/TrustBadge'

export const Route = createFileRoute('/merchants')({
  component: MerchantsList,
})

interface Merchant {
  id: string
  name: string
  address: string
  isVerified: boolean
  isOpen: boolean
  brands: string[]
  distance: string
}

const DEMO_MERCHANTS: Merchant[] = [
  { id: '1', name: 'Gasul Center Manila', address: '123 Taft Ave, Manila', isVerified: true, isOpen: true, brands: ['Gasul', 'Solane'], distance: '1.2 km' },
  { id: '2', name: 'Solane Depot QC', address: '456 Quezon Ave, QC', isVerified: true, isOpen: true, brands: ['Solane'], distance: '2.5 km' },
  { id: '3', name: 'Petron Gas Station', address: '789 EDSA, Makati', isVerified: false, isOpen: false, brands: ['Petron'], distance: '3.1 km' },
  { id: '4', name: 'LPG Express', address: '321 Roxas Blvd, Manila', isVerified: true, isOpen: true, brands: ['Gasul', 'Petron', 'Solane'], distance: '4.0 km' },
]

function MerchantsList() {
  const openMerchants = DEMO_MERCHANTS.filter(m => m.isOpen)
  const closedMerchants = DEMO_MERCHANTS.filter(m => !m.isOpen)

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
                    key={merchant.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-orange-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{merchant.name}</h3>
                          <TrustBadge isVerified={merchant.isVerified} />
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{merchant.address}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1 text-green-400">
                            <Clock size={14} />
                            Open
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {merchant.distance}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-slate-700">
                        <Phone size={14} />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {merchant.brands.map((brand) => (
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
                    key={merchant.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{merchant.name}</h3>
                          <TrustBadge isVerified={merchant.isVerified} />
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{merchant.address}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1 text-red-400">
                            <Clock size={14} />
                            Closed
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {merchant.distance}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {merchant.brands.map((brand) => (
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
