import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getOrderAnalytics, getMerchantById } from '@/server/merchants.functions'
import { getMerchantOrders } from '@/server/orders.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Package, TrendingUp, Truck, XCircle, MapPin } from 'lucide-react'
import TrustBadge from '@/components/TrustBadge'
import { Button } from '@/components/ui/button'

// Preset polygon areas (Nueva Ecija cities)
// Each polygon is a closed bounding-box ring of [lng, lat] coordinate pairs
const AREA_PRESETS: Record<string, { label: string; polygon: number[][][] }> = {
  all: { label: 'All Areas', polygon: [] },
  cabanatuan: {
    label: 'Cabanatuan City',
    polygon: [[
      [120.9300, 15.5100],
      [121.0200, 15.5100],
      [121.0200, 15.4500],
      [120.9300, 15.4500],
      [120.9300, 15.5100],
    ]],
  },
  san_jose: {
    label: 'San Jose City',
    polygon: [[
      [120.9400, 15.8200],
      [121.0400, 15.8200],
      [121.0400, 15.7600],
      [120.9400, 15.7600],
      [120.9400, 15.8200],
    ]],
  },
  gapan: {
    label: 'Gapan City',
    polygon: [[
      [120.9200, 15.3200],
      [121.0000, 15.3200],
      [121.0000, 15.2700],
      [120.9200, 15.2700],
      [120.9200, 15.3200],
    ]],
  },
  palayan: {
    label: 'Palayan City',
    polygon: [[
      [121.0500, 15.5700],
      [121.1400, 15.5700],
      [121.1400, 15.5100],
      [121.0500, 15.5100],
      [121.0500, 15.5700],
    ]],
  },
}

export const Route = createFileRoute('/_authenticated/merchant/overview')({
  loader: async ({ context }) => {
    const merchantId = (context as any).merchantId as string
    const [analytics, orders, merchant] = await Promise.all([
      getOrderAnalytics({ data: { merchantId } }),
      getMerchantOrders({ data: { merchantId } }),
      getMerchantById({ data: { merchantId } }),
    ])
    return { analytics, orders, merchant, merchantId }
  },
  component: MerchantOverview,
})

function MerchantOverview() {
  const { analytics: initialAnalytics, orders, merchant, merchantId } = Route.useLoaderData()

  const [selectedArea, setSelectedArea] = useState('all')
  const [analytics, setAnalytics] = useState(initialAnalytics)
  const [loadingArea, setLoadingArea] = useState(false)

  // Refetch analytics when area filter changes
  useEffect(() => {
    if (selectedArea === 'all') {
      setAnalytics(initialAnalytics)
      return
    }

    const preset = AREA_PRESETS[selectedArea]
    if (!preset || preset.polygon.length === 0) return

    setLoadingArea(true)
    getOrderAnalytics({
      data: {
        merchantId,
        polygon: preset.polygon,
      },
    })
      .then((result) => setAnalytics(result))
      .catch(() => {
        // On error, fall back to unfiltered
        setAnalytics(initialAnalytics)
      })
      .finally(() => setLoadingArea(false))
  }, [selectedArea, merchantId, initialAnalytics])

  const stats = [
    { label: 'Total Orders', value: analytics.totalOrders, icon: Package, color: 'text-blue-500' },
    { label: 'Total Revenue', value: `\u20B1${analytics.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Delivered', value: analytics.deliveredOrders, icon: Truck, color: 'text-orange-500' },
    { label: 'Cancelled', value: analytics.cancelledOrders, icon: XCircle, color: 'text-rose-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          {merchant && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{merchant.shopName}</span>
              <TrustBadge isVerified={merchant.isVerified ?? false} showLabel />
            </div>
          )}
        </div>

        {/* Area Filter */}
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filter by area:</span>
          <div className="flex gap-1 flex-wrap">
            {Object.entries(AREA_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedArea === key ? 'default' : 'outline'}
                onClick={() => setSelectedArea(key)}
                className={
                  selectedArea === key
                    ? 'bg-orange-500 hover:bg-orange-600 text-white text-xs h-7'
                    : 'border-border text-muted-foreground text-xs h-7'
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {loadingArea && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon size={18} className={stat.color} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue by Brand */}
      {Object.keys(analytics.byBrand).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Revenue by Brand</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(analytics.byBrand).map(([brand, data]) => (
              <Card key={brand} className="bg-card border-border">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{brand}</p>
                  <p className="text-xl font-bold text-foreground">{'\u20B1'}{(data as any).revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{(data as any).count} orders</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Orders</h2>
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-muted/50">
                <TableHead className="text-muted-foreground">Order ID</TableHead>
                <TableHead className="text-muted-foreground">Brand</TableHead>
                <TableHead className="text-muted-foreground">Size</TableHead>
                <TableHead className="text-muted-foreground">Qty</TableHead>
                <TableHead className="text-muted-foreground">Total</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No orders yet
                  </TableCell>
                </TableRow>
              ) : (
                orders.slice(0, 10).map((order: any) => (
                  <TableRow key={order._id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {order._id.slice(-6)}
                    </TableCell>
                    <TableCell className="text-foreground">{order.tankBrand}</TableCell>
                    <TableCell className="text-muted-foreground">{order.tankSize}</TableCell>
                    <TableCell className="text-muted-foreground">{order.quantity}</TableCell>
                    <TableCell className="text-orange-500 font-semibold">
                      {'\u20B1'}{order.totalPrice}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-amber-600 dark:text-yellow-400',
    accepted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dispatched: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  )
}
