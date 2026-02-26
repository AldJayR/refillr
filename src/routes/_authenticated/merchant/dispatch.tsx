import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useTransition } from 'react'
import { getMerchantOrders, updateOrderStatus } from '@/server/orders.functions'
import { getNearbyRiders } from '@/server/rider.functions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Truck, RefreshCw, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type MerchantOrder = Awaited<ReturnType<typeof getMerchantOrders>>[number]
type NearbyRider = Awaited<ReturnType<typeof getNearbyRiders>>[number]

interface MerchantContext {
  merchantId: string
  merchant: {
    location?: { coordinates: [number, number] }
    deliveryRadiusMeters?: number
  }
}

export const Route = createFileRoute('/_authenticated/merchant/dispatch')({
  loader: async ({ context }) => {
    const { merchantId, merchant } = context as MerchantContext
    const orders = await getMerchantOrders({ data: { merchantId } })
    return { orders, merchantId, merchant }
  },
  component: MerchantDispatch,
})

function MerchantDispatch() {
  const { orders: initialOrders, merchant } = Route.useLoaderData()
  const [orders, setOrders] = useState<MerchantOrder[]>(initialOrders)
  const [riders, setRiders] = useState<NearbyRider[]>([])
  const [isPending, startTransition] = useTransition()
  const [assigningLoading, setAssigningLoading] = useState<string | null>(null)

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const activeOrders = orders.filter((o) => ['accepted', 'dispatched'].includes(o.status))

  const fetchRiders = useCallback(async () => {
    const coords = merchant?.location?.coordinates
    if (!coords) return
    startTransition(async () => {
      try {
        const nearbyRiders = await getNearbyRiders({
          data: {
            latitude: coords[1],
            longitude: coords[0],
            radiusMeters: merchant?.deliveryRadiusMeters || 10000,
          },
        })
        setRiders(nearbyRiders)
      } catch {
        toast.error('Failed to fetch nearby riders')
      }
    })
  }, [merchant])

  useEffect(() => {
    fetchRiders()
  }, [fetchRiders])

  const [selectedRiders, setSelectedRiders] = useState<Record<string, string>>({})

  const handleAssignRider = async (orderId: string, riderId: string) => {
    if (!riderId) {
      toast.error('Please select a rider')
      return
    }

    setAssigningLoading(orderId)
    try {
      const success = await updateOrderStatus({
        data: {
          orderId,
          status: 'accepted',
          riderId,
        },
      })
      if (success) {
        toast.success('Rider assigned successfully')
        // Optimistic update
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, status: 'accepted', riderId } : o
          )
        )
      } else {
        toast.error('Failed to assign rider')
      }
    } catch {
      toast.error('Failed to assign rider')
    } finally {
      setAssigningLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dispatch Hub</h1>
          <p className="text-sm text-slate-400">Manage orders and assign riders</p>
        </div>
        <Button
          variant="outline"
          className="border-slate-700"
          onClick={fetchRiders}
          disabled={isPending}
        >
          <RefreshCw size={16} className={`mr-2 ${isPending ? 'animate-spin' : ''}`} />
          Refresh Riders
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-400">
                <Clock size={18} /> Pending Orders ({pendingOrders.length})
              </CardTitle>
              <CardDescription className="text-slate-400">
                Orders waiting to be assigned to a rider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No pending orders.</p>
              ) : (
                pendingOrders.map((order) => (
                  <div
                    key={order._id}
                    className="p-4 border border-slate-800 rounded-lg flex flex-col md:flex-row gap-4 justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-white">
                        {order.tankBrand} {order.tankSize} ×{order.quantity}
                      </h3>
                      <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin size={14} /> {order.deliveryAddress}
                      </p>
                      <p className="text-orange-500 font-bold mt-2">₱{order.totalPrice}</p>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Select
                        value={selectedRiders[order._id] || ''}
                        onValueChange={(val) =>
                          setSelectedRiders((prev) => ({ ...prev, [order._id]: val }))
                        }
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue placeholder="Select a rider" />
                        </SelectTrigger>
                        <SelectContent>
                          {riders.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No online riders nearby
                            </SelectItem>
                          ) : (
                            riders.map((rider) => (
                              <SelectItem key={rider._id} value={rider._id}>
                                {rider.firstName} {rider.lastName} ({rider.vehicleType})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        disabled={!selectedRiders[order._id] || assigningLoading === order._id}
                        onClick={() => handleAssignRider(order._id, selectedRiders[order._id])}
                      >
                        {assigningLoading === order._id ? 'Assigning...' : 'Assign Rider'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Truck size={18} /> Active Deliveries ({activeOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No active deliveries.</p>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <div
                      key={order._id}
                      className="p-3 border border-slate-800 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {order.tankBrand} {order.tankSize} ×{order.quantity}
                        </p>
                        <p className="text-xs text-slate-500 capitalize mt-1">
                          Status: <span className="text-blue-400">{order.status}</span>
                        </p>
                      </div>
                      <span className="text-orange-500 font-bold">₱{order.totalPrice}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-slate-900 border-slate-800 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <CheckCircle size={18} /> Online Riders ({riders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riders.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No riders currently online in your area.</p>
              ) : (
                <div className="space-y-3">
                  {riders.map((rider) => (
                    <div key={rider._id} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <p className="font-medium text-white">
                        {rider.firstName} {rider.lastName}
                      </p>
                      <p className="text-xs text-slate-400 capitalize mt-1">
                        {rider.vehicleType} • {rider.plateNumber || 'No plate'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
