import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import {
    ArrowLeft,
    MapPin,
    Package,
    Clock,
    CheckCircle,
    Truck,
    Navigation,
    RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    getPendingOrdersNearby,
    acceptOrder,
    markDispatched,
    markDelivered
} from '@/server/rider.functions'
import { z } from 'zod'

const searchSchema = z.object({
    lat: z.number().optional().default(14.5995),
    lng: z.number().optional().default(120.9842),
})

export const Route = createFileRoute('/_authenticated/rider')({
    validateSearch: searchSchema,
    loaderDeps: ({ search }) => ({ lat: search.lat, lng: search.lng }),
    loader: ({ deps }) =>
        getPendingOrdersNearby({
            data: { latitude: deps.lat, longitude: deps.lng, radiusMeters: 10000 },
        }),
    component: RiderDashboard,
})

interface OrderItem {
    _id: string
    userId: string
    merchantId: string
    tankBrand: string
    tankSize: string
    quantity: number
    totalPrice: number
    status: string
    deliveryAddress: string
    createdAt?: string
}

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

    const [orders, setOrders] = useState<OrderItem[]>(initialOrders as OrderItem[])
    const [activeOrders, setActiveOrders] = useState<OrderItem[]>([])
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Detect geolocation once and update search params to trigger loader re-run
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const newLat = pos.coords.latitude
                const newLng = pos.coords.longitude
                if (Math.abs(newLat - lat) > 0.001 || Math.abs(newLng - lng) > 0.001) {
                    navigate({ search: { lat: newLat, lng: newLng } })
                }
            })
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Manual refresh for polling
    const fetchOrders = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getPendingOrdersNearby({
                data: {
                    latitude: lat,
                    longitude: lng,
                    radiusMeters: 10000,
                }
            })
            setOrders(result as OrderItem[])
        } catch {
            console.error('Failed to fetch orders')
        } finally {
            setLoading(false)
        }
    }, [lat, lng])

    // Poll every 30 seconds for new orders
    useEffect(() => {
        const interval = setInterval(fetchOrders, 30000)
        return () => clearInterval(interval)
    }, [fetchOrders])

    const handleAccept = async (orderId: string) => {
        setActionLoading(orderId)
        try {
            const result = await acceptOrder({
                data: { orderId }
            }) as { success: boolean; orderId?: string }

            if (result.success) {
                const acceptedOrder = orders.find(o => o._id === orderId)
                if (acceptedOrder) {
                    setActiveOrders(prev => [...prev, { ...acceptedOrder, status: 'accepted' }])
                    setOrders(prev => prev.filter(o => o._id !== orderId))
                }
            }
        } catch {
            console.error('Failed to accept order')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDispatch = async (orderId: string) => {
        setActionLoading(orderId)
        try {
            const success = await markDispatched({ data: orderId })
            if (success) {
                setActiveOrders(prev =>
                    prev.map(o => o._id === orderId ? { ...o, status: 'dispatched' } : o)
                )
            }
        } catch {
            console.error('Failed to mark dispatched')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeliver = async (orderId: string) => {
        setActionLoading(orderId)
        try {
            const success = await markDelivered({ data: orderId })
            if (success) {
                setActiveOrders(prev => prev.filter(o => o._id !== orderId))
            }
        } catch {
            console.error('Failed to mark delivered')
        } finally {
            setActionLoading(null)
        }
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
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
                            <p className="text-xs text-slate-400">
                                📍 {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="border-slate-700"
                        onClick={fetchOrders}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
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
