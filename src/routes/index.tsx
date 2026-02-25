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

export const Route = createFileRoute('/')({
  component: Dashboard,
})

interface MerchantMarker {
  id: string
  coordinates: [number, number]
  shopName: string
  isVerified: boolean
  isOpen: boolean
}

const DEMO_MERCHANTS: MerchantMarker[] = [
  { id: '1', coordinates: [120.9842, 14.5995], shopName: 'Gasul Center Manila', isVerified: true, isOpen: true },
  { id: '2', coordinates: [120.9860, 14.5980], shopName: 'Solane Depot QC', isVerified: true, isOpen: true },
  { id: '3', coordinates: [120.9820, 14.6010], shopName: 'Petron Gas Station', isVerified: false, isOpen: false },
]

function Dashboard() {
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative h-[60vh]">
        <Map 
          markers={DEMO_MERCHANTS}
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
                <span className="text-white font-semibold">Refillr</span>
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
          {DEMO_MERCHANTS.map((merchant) => (
            <div
              key={merchant.id}
              className={cn(
                "bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-orange-500/50 transition-colors cursor-pointer",
                selectedMerchant === merchant.id && "border-orange-500"
              )}
              onClick={() => setSelectedMerchant(merchant.id)}
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
                      1.2 km away
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-slate-700 hover:bg-slate-800">
                  <Phone size={14} />
                </Button>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {['Gasul', 'Solane', 'Petron'].map((brand) => (
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

        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30">
          <h3 className="font-semibold text-white mb-2">Safety First</h3>
          <p className="text-sm text-slate-300">
            Look for the <span className="text-green-400 font-medium">DOE Verified</span> badge to ensure you're getting safe, properly maintained gas tanks.
          </p>
        </div>
      </div>
    </div>
  )
}
