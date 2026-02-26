import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useTransition } from 'react'
import { Link } from '@tanstack/react-router'
import {
    ArrowLeft,
    MapPin,
    Package,
    Clock,
    CheckCircle,
    Truck,
    Navigation,
    RefreshCw,
    Wifi,
    WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    getPendingOrdersNearby,
    acceptOrder,
    markDispatched,
    markDelivered,
    getMyRider,
    updateRiderStatus,
    updateRiderLocation,
} from '@/server/rider.functions'
import { useGeolocation } from '@/hooks/useGeolocation'
import { toast } from 'sonner'
import { z } from 'zod'
import { formatTime } from '@/lib/utils'

const searchSchema = z.object({
    lat: z.number().optional().default(14.5995),
    lng: z.number().optional().default(120.9842),
})

export const Route = createFileRoute('/_authenticated/rider')({
    validateSearch: searchSchema,
    beforeLoad: async () => {
      const rider = await getMyRider()
      if (!rider) {
        throw redirect({ to: '/rider-setup' })
      }
      return { riderId: rider._id as string, rider }
    },
    loaderDeps: ({ search }) => ({ lat: search.lat, lng: search.lng }),
    loader: ({ deps }) =>
        getPendingOrdersNearby({
            data: { latitude: deps.lat, longitude: deps.lng, radiusMeters: 10000 },
        }),
    component: RiderDashboard,
})

type OrderItem = Awaited<ReturnType<typeof getPendingOrdersNearby>>[number]

const STATUS_ICONS: Record<string, typeof Package> = {
    pending: Clock,
    accepted: CheckCircle,
    dispatched: Truck,
    delivered: Navigation,
}

function RiderDashboard() {
    const initialOrders = Route.useLoaderData()
    const { lat, lng } = Route.useSearch()
    const navigate = Route.useNavigate()
    const context = Route.useRouteContext()
    const rider = context.rider as { _id: string; isOnline?: boolean }

    const [orders, setOrders] = useState(initialOrders)
    const [activeOrders, setActiveOrders] = useState<OrderItem[]>([])
    const [isFetching, startFetchTransition] = useTransition()
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [isOnline, setIsOnline] = useState(rider?.isOnline ?? false)

    const handleStatusToggle = async (checked: boolean) => {
        setIsOnline(checked)
        try {
            await updateRiderStatus({ data: { isOnline: checked } })
            toast.success(checked ? 'You are now online!' : 'You are now offline')
        } catch {
            setIsOnline(!checked)
            toast.error('Failed to update status')
        }
    }

    const updateLocation = useCallback(async () => {
        if (!isOnline) return
        try {
            await updateRiderLocation({ data: { latitude: lat, longitude: lng } })
        } catch (e) {
            console.error('Failed to update location:', e)
        }
    }, [lat, lng, isOnline])

    useEffect(() => {
        if (isOnline) {
            updateLocation()
            const interval = setInterval(updateLocation, 30000)
            return () => clearInterval(interval)
        }
    }, [isOnline, updateLocation])

    useGeolocation({
        currentLat: lat,
        currentLng: lng,
        onLocationDetected: (newLat, newLng) => {
            navigate({ search: { lat: newLat, lng: newLng } })
        },
    })

    // Manual refresh for polling
    const fetchOrders = useCallback(async () => {
        startFetchTransition(async () => {
            try {
                const result = await getPendingOrdersNearby({
                    data: {
                        latitude: lat,
                        longitude: lng,
                        radiusMeters: 10000,
                    }
                })
                setOrders(result)
            } catch {
                toast.error('Failed to fetch nearby orders')
            }
        })
    }, [lat, lng])

    // Poll every 30 seconds for new orders; pause when tab is hidden
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchOrders()
            }
        }, 30000)
        return () => clearInterval(interval)
    }, [fetchOrders])

    const handleAccept = async (orderId: string) => {
        setActionLoading(orderId)
        // Optimistic: move to active immediately
        const acceptedOrder = orders.find(o => o._id === orderId)
        if (acceptedOrder) {
            setActiveOrders(prev => [...prev, { ...acceptedOrder, status: 'accepted' }])
            setOrders(prev => prev.filter(o => o._id !== orderId))
        }

        try {
            const result = await acceptOrder({
                data: { orderId }
            })

            if (result.success) {
                toast.success('Order accepted!', {
                    description: `${acceptedOrder?.tankBrand} ${acceptedOrder?.tankSize} - ₱${acceptedOrder?.totalPrice}`,
                })
            } else {
                // Rollback optimistic update
                if (acceptedOrder) {
                    setActiveOrders(prev => prev.filter(o => o._id !== orderId))
                    setOrders(prev => [...prev, acceptedOrder])
                }
                toast.error('Failed to accept order')
            }
        } catch {
            // Rollback optimistic update
            if (acceptedOrder) {
                setActiveOrders(prev => prev.filter(o => o._id !== orderId))
                setOrders(prev => [...prev, acceptedOrder])
            }
            toast.error('Failed to accept order')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDispatch = async (orderId: string) => {
        setActionLoading(orderId)
        // Optimistic: update status immediately
        setActiveOrders(prev =>
            prev.map(o => o._id === orderId ? { ...o, status: 'dispatched' } : o)
        )

        try {
            const success = await markDispatched({ data: orderId })
            if (success) {
                toast.success('Order dispatched! On the way.')
            } else {
                // Rollback
                setActiveOrders(prev =>
                    prev.map(o => o._id === orderId ? { ...o, status: 'accepted' } : o)
                )
                toast.error('Failed to mark as dispatched')
            }
        } catch {
            // Rollback
            setActiveOrders(prev =>
                prev.map(o => o._id === orderId ? { ...o, status: 'accepted' } : o)
            )
            toast.error('Failed to mark as dispatched')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeliver = async (orderId: string) => {
        setActionLoading(orderId)
        // Optimistic: remove from active immediately
        const deliveredOrder = activeOrders.find(o => o._id === orderId)
        setActiveOrders(prev => prev.filter(o => o._id !== orderId))

        try {
            const success = await markDelivered({ data: orderId })
            if (success) {
                toast.success('Order delivered! Great job.', {
                    description: `₱${deliveredOrder?.totalPrice} earned`,
                })
            } else {
                // Rollback
                if (deliveredOrder) {
                    setActiveOrders(prev => [...prev, deliveredOrder])
                }
                toast.error('Failed to mark as delivered')
            }
        } catch {
            // Rollback
            if (deliveredOrder) {
                setActiveOrders(prev => [...prev, deliveredOrder])
            }
            toast.error('Failed to mark as delivered')
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link to="/">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white">Rider Dashboard</h1>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                {isOnline ? (
                                    <><Wifi size={10} className="text-green-500" /> Online</>
                                ) : (
                                    <><WifiOff size={10} className="text-slate-500" /> Offline</>
                                )}
                                {' • '}
                                {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={isOnline}
                                onCheckedChange={handleStatusToggle}
                                className="data-[state=checked]:bg-green-500"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="border-slate-700"
                            onClick={fetchOrders}
                            disabled={isFetching}
                        >
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </div>

                {/* Active Orders */}
                {activeOrders.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
                            <Truck size={14} />
                            My Active Orders ({activeOrders.length})
                        </h2>
                        <div className="space-y-3">
                            {activeOrders.map((order) => {
                                const StatusIcon = STATUS_ICONS[order.status] || Package
                                return (
                                    <div
                                        key={order._id}
                                        className="bg-slate-900 border border-orange-500/30 rounded-xl p-4"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <StatusIcon size={16} className="text-orange-500" />
                                                    <span className="text-sm font-medium text-orange-400 capitalize">
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-white font-semibold mt-1">
                                                    {order.tankBrand} {order.tankSize} ×{order.quantity}
                                                </p>
                                            </div>
                                            <span className="text-orange-500 font-bold">₱{order.totalPrice}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                                            <MapPin size={14} />
                                            <span className="truncate">{order.deliveryAddress}</span>
                                        </div>

                                        {order.status === 'accepted' && (
                                            <Button
                                                className="w-full bg-purple-600 hover:bg-purple-700"
                                                disabled={actionLoading === order._id}
                                                onClick={() => handleDispatch(order._id)}
                                            >
                                                {actionLoading === order._id ? 'Updating...' : '📦 Mark as Dispatched'}
                                            </Button>
                                        )}
                                        {order.status === 'dispatched' && (
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                disabled={actionLoading === order._id}
                                                onClick={() => handleDeliver(order._id)}
                                            >
                                                {actionLoading === order._id ? 'Updating...' : '✅ Mark as Delivered'}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Available Orders */}
                <div>
                    <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <Package size={14} />
                        Available Orders ({orders.length})
                    </h2>

                    {orders.length === 0 ? (
                        <div className="text-center py-12">
                            <Package size={48} className="text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 mb-2">No pending orders nearby</p>
                            <p className="text-xs text-slate-500">
                                Orders within 10km of your location will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order) => (
                                <div
                                    key={order._id}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-orange-500/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-white font-semibold">
                                                {order.tankBrand} {order.tankSize} ×{order.quantity}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {order.createdAt ? formatTime(order.createdAt) : 'Just now'}
                                            </p>
                                        </div>
                                        <span className="text-orange-500 font-bold">₱{order.totalPrice}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                                        <MapPin size={14} className="shrink-0" />
                                        <span className="truncate">{order.deliveryAddress}</span>
                                    </div>

                                    <Button
                                        className="w-full bg-orange-500 hover:bg-orange-600"
                                        disabled={actionLoading === order._id}
                                        onClick={() => handleAccept(order._id)}
                                    >
                                        {actionLoading === order._id ? 'Accepting...' : 'Accept Order'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
