import { cn, formatDateTime } from '@/lib/utils'
import { getUserOrders, cancelOrder } from '@/server/orders.functions'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Package, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type UserOrder = Awaited<ReturnType<typeof getUserOrders>>[number]

export const Route = createFileRoute('/_authenticated/orders')({
    loader: () => getUserOrders(),
    component: OrderHistory,
})

const STATUS_COLORS = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    accepted: 'bg-blue-500/20 text-blue-400',
    dispatched: 'bg-purple-500/20 text-purple-400',
    delivered: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
}

function OrderHistory() {
    const initialOrders = Route.useLoaderData()
    const [orders, setOrders] = useState<UserOrder[]>(initialOrders)
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    const pendingOrders = orders.filter((o: UserOrder) => o.status === 'pending')
    const activeOrders = orders.filter((o: UserOrder) => o.status === 'accepted' || o.status === 'dispatched')
    const completedOrders = orders.filter((o: UserOrder) => o.status === 'delivered' || o.status === 'cancelled')

    const handleCancel = async (orderId: string) => {
        setCancellingId(orderId)
        // Optimistic: move to cancelled immediately
        setOrders(prev =>
            prev.map((o: UserOrder) => o._id === orderId ? { ...o, status: 'cancelled' } : o)
        )

        try {
            const success = await cancelOrder({
                data: {
                    orderId,
                    cancellationReason: 'Cancelled by user',
                },
            })
            if (success) {
                toast.success('Order cancelled successfully')
            } else {
                // Rollback
                setOrders(prev =>
                    prev.map((o: UserOrder) => o._id === orderId ? { ...o, status: 'pending' } : o)
                )
                toast.error('Cannot cancel this order. It may have already been accepted.')
            }
        } catch {
            // Rollback
            setOrders(prev =>
                prev.map((o: UserOrder) => o._id === orderId ? { ...o, status: 'pending' } : o)
            )
            toast.error('Failed to cancel order')
        } finally {
            setCancellingId(null)
        }
    }

    return (
        <div className="p-4">
            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link to="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">My Orders</h1>
                </div>

                {/* Pending orders — cancellable */}
                {pendingOrders.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-sm font-medium text-amber-500 mb-3">Pending ({pendingOrders.length})</h2>
                        <div className="space-y-3">
                            {pendingOrders.map((order: UserOrder) => (
                                <div
                                    key={order._id}
                                    className="glass-card rounded-xl p-5 animate-fade-in border-amber-500/20"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-foreground">Refill Order</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {order.tankBrand} {order.tankSize} x{order.quantity}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-xs font-medium capitalize",
                                            STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                                        )}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock size={14} />
                                            {order.createdAt ? formatDateTime(order.createdAt) : 'Just now'}
                                        </div>
                                        <span className="text-orange-500 font-semibold">₱{order.totalPrice}</span>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                        disabled={cancellingId === order._id}
                                        onClick={() => handleCancel(order._id)}
                                    >
                                        <XCircle size={14} className="mr-2" />
                                        {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active orders — accepted/dispatched, not cancellable */}
                {activeOrders.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-sm font-medium text-blue-500 mb-3">In Progress ({activeOrders.length})</h2>
                        <div className="space-y-3">
                            {activeOrders.map((order: UserOrder) => (
                                <div
                                    key={order._id}
                                    className="glass-card rounded-xl p-5 animate-fade-in"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-foreground">Refill Order</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {order.tankBrand} {order.tankSize} x{order.quantity}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-xs font-medium capitalize",
                                            STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                                        )}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock size={14} />
                                            {order.createdAt ? formatDateTime(order.createdAt) : 'Just now'}
                                        </div>
                                        <span className="text-orange-500 font-semibold">₱{order.totalPrice}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed / Cancelled orders */}
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3">Order History</h2>
                    {completedOrders.length > 0 ? (
                        <div className="space-y-3">
                            {completedOrders.map((order: UserOrder) => (
                                <div
                                    key={order._id}
                                    className="glass-card rounded-xl p-5 opacity-75 animate-fade-in"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-foreground">Refill Order</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {order.tankBrand} {order.tankSize} x{order.quantity}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-xs font-medium capitalize",
                                            STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                                        )}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock size={14} />
                                            {order.createdAt ? formatDateTime(order.createdAt) : 'Completed'}
                                        </div>
                                        <span className="text-orange-500 font-semibold">₱{order.totalPrice}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package size={48} className="text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">No orders yet</p>
                            <Link to="/order/new">
                                <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
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
