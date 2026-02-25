import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Package,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/orders')({
  component: OrderHistory,
})

interface Order {
  id: string
  merchantName: string
  tankBrand: string
  tankSize: string
  quantity: number
  totalPrice: number
  status: 'pending' | 'accepted' | 'dispatched' | 'delivered' | 'cancelled'
  createdAt: string
}

const DEMO_ORDERS: Order[] = [
  {
    id: '1',
    merchantName: 'Gasul Center Manila',
    tankBrand: 'Gasul',
    tankSize: '11kg',
    quantity: 1,
    totalPrice: 1200,
    status: 'delivered',
    createdAt: '2024-01-15 14:30'
  },
  {
    id: '2',
    merchantName: 'Solane Depot QC',
    tankBrand: 'Solane',
    tankSize: '5kg',
    quantity: 2,
    totalPrice: 1200,
    status: 'pending',
    createdAt: '2024-01-20 09:15'
  }
]

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  accepted: 'bg-blue-500/20 text-blue-400',
  dispatched: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

function OrderHistory() {
  const pendingOrders = DEMO_ORDERS.filter(o => o.status === 'pending')
  const completedOrders = DEMO_ORDERS.filter(o => o.status !== 'pending')

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">My Orders</h1>
        </div>

        {pendingOrders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-slate-400 mb-3">Active Orders</h2>
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{order.merchantName}</h3>
                      <p className="text-sm text-slate-400">
                        {order.tankBrand} {order.tankSize} x{order.quantity}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium capitalize",
                      STATUS_COLORS[order.status]
                    )}>
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock size={14} />
                      {order.createdAt}
                    </div>
                    <span className="text-orange-500 font-semibold">₱{order.totalPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Order History</h2>
          {completedOrders.length > 0 ? (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 opacity-75"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{order.merchantName}</h3>
                      <p className="text-sm text-slate-400">
                        {order.tankBrand} {order.tankSize} x{order.quantity}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium capitalize",
                      STATUS_COLORS[order.status]
                    )}>
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock size={14} />
                      {order.createdAt}
                    </div>
                    <span className="text-orange-500 font-semibold">₱{order.totalPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No orders yet</p>
              <Link to="/order/new">
                <Button className="mt-4 bg-orange-500 hover:bg-orange-600">
                  Place Your First Order
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
