import { createFileRoute, Outlet, Link, redirect } from '@tanstack/react-router'
import { BarChart3, Map, Package, DollarSign, Flame, Truck } from 'lucide-react'
import { getMyMerchant } from '@/server/merchants.functions'

export const Route = createFileRoute('/_authenticated/merchant')({
  beforeLoad: async () => {
    const merchant = await getMyMerchant()

    if (!merchant) {
      throw redirect({ to: '/merchant-setup' })
    }

    return { merchantId: merchant._id as string, merchant }
  },
  component: MerchantLayout,
})

const NAV_ITEMS = [
  { to: '/merchant/overview', label: 'Overview', icon: BarChart3 },
  { to: '/merchant/dispatch', label: 'Dispatch', icon: Truck },
  { to: '/merchant/heatmap', label: 'Demand Heatmap', icon: Map },
  { to: '/merchant/inventory', label: 'Inventory', icon: Package },
  { to: '/merchant/pricing', label: 'Pricing', icon: DollarSign },
] as const

function MerchantLayout() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile, shown on md+ */}
      <aside className="hidden md:flex w-64 glass-sidebar flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        <div className="p-6 border-b border-slate-800/50">
          <h2 className="text-lg font-bold font-heading flex items-center gap-2">
            <Flame className="text-orange-500" size={20} />
            <span className="text-gradient">Merchant Hub</span>
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors text-sm"
              activeProps={{
                className:
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-orange-500/10 text-orange-400 font-medium',
              }}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile nav - shown on small screens */}
      <nav className="md:hidden flex overflow-x-auto gap-1 p-2 glass-card border-b border-slate-800/50">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white text-sm whitespace-nowrap"
            activeProps={{
              className:
                'flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-400 font-medium whitespace-nowrap',
            }}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
