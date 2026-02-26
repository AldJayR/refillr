# Merchant Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-page merchant dashboard with sidebar navigation, overview analytics, demand heatmap, inventory management, and live pricing controls.

**Architecture:** Nested TanStack Router layout under `_authenticated/merchant.tsx` (sidebar shell with `<Outlet />`). Four child pages: overview, heatmap, inventory, pricing. All pages are behind Clerk auth. Server functions already exist (`getOrderAnalytics`, `updateMerchantPricing`, `updateInventory`, `getMerchantOrders`). We connect them to the UI.

**Tech Stack:** TanStack Start, TanStack Router (nested layouts), TanStack Table, Mapbox GL JS (heatmap layer), shadcn/ui (Card, Table, Switch, Tabs, Select, Input, Button, Sonner toasts), Zod, Clerk auth.

---

### Task 1: Merchant Layout Shell (Sidebar + Outlet)

**Files:**
- Create: `src/routes/_authenticated/merchant.tsx`

**What to build:**
A layout route that renders a sidebar on the left and an `<Outlet />` on the right. The sidebar has 4 navigation links: Overview, Demand Heatmap, Inventory, Pricing. Use the existing `glass-sidebar` CSS class for styling. The layout should be responsive (sidebar collapses to a top nav on mobile).

For now, hardcode `merchantId` as a constant at the top of the file (`DEMO_MERCHANT_ID = '000000000000000000000000'`). This will be replaced with real merchant association later.

**Implementation:**

```tsx
import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { BarChart3, Map, Package, DollarSign, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DEMO_MERCHANT_ID = '000000000000000000000000'

export const Route = createFileRoute('/_authenticated/merchant')({
  component: MerchantLayout,
})

const NAV_ITEMS = [
  { to: '/merchant/overview', label: 'Overview', icon: BarChart3 },
  { to: '/merchant/heatmap', label: 'Demand Heatmap', icon: Map },
  { to: '/merchant/inventory', label: 'Inventory', icon: Package },
  { to: '/merchant/pricing', label: 'Pricing', icon: DollarSign },
] as const

function MerchantLayout() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile, shown on md+ */}
      <aside className="hidden md:flex w-64 glass-sidebar flex-col shrink-0 sticky top-0 h-screen">
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
                className: 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-orange-500/10 text-orange-400 font-medium',
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
              className: 'flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-400 font-medium whitespace-nowrap',
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
```

**Step 1:** Create the file with the code above.
**Step 2:** Add a "Merchant Dashboard" link to `src/components/Header.tsx` in the sidebar nav, right below the "Rider Workspace" link. Use `<Store size={20} />` icon from lucide-react and link to `/merchant/overview`.
**Step 3:** Run `pnpm dev` briefly to confirm the route tree auto-generates without errors, then stop. Expected: TanStack Router picks up the new `_authenticated/merchant` layout route.

---

### Task 2: Overview Page (Analytics Cards + Orders Table)

**Files:**
- Create: `src/routes/_authenticated/merchant/overview.tsx`

**What to build:**
The default landing page for the merchant dashboard. Uses `getOrderAnalytics` and `getMerchantOrders` server functions to display:
1. Four `Card` components at the top: Total Orders, Total Revenue, Delivered, Cancelled.
2. A breakdown section showing revenue by Brand (small cards or list).
3. A recent orders table using `@tanstack/react-table` + shadcn `Table` component.

Use the hardcoded `DEMO_MERCHANT_ID` from the parent layout.

**Implementation:**

```tsx
import { createFileRoute } from '@tanstack/react-router'
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
import { Package, TrendingUp, Truck, XCircle } from 'lucide-react'
import TrustBadge from '@/components/TrustBadge'

const DEMO_MERCHANT_ID = '000000000000000000000000'

export const Route = createFileRoute('/_authenticated/merchant/overview')({
  loader: async () => {
    const [analytics, orders, merchant] = await Promise.all([
      getOrderAnalytics({ data: { merchantId: DEMO_MERCHANT_ID } }),
      getMerchantOrders({ data: { merchantId: DEMO_MERCHANT_ID } }),
      getMerchantById({ data: { merchantId: DEMO_MERCHANT_ID } }),
    ])
    return { analytics, orders, merchant }
  },
  component: MerchantOverview,
})

function MerchantOverview() {
  const { analytics, orders, merchant } = Route.useLoaderData()

  const stats = [
    { label: 'Total Orders', value: analytics.totalOrders, icon: Package, color: 'text-blue-400' },
    { label: 'Total Revenue', value: `₱${analytics.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Delivered', value: analytics.deliveredOrders, icon: Truck, color: 'text-orange-400' },
    { label: 'Cancelled', value: analytics.cancelledOrders, icon: XCircle, color: 'text-red-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          {merchant && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-400">{merchant.shopName}</span>
              <TrustBadge isVerified={merchant.isVerified ?? false} showLabel />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{stat.label}</CardTitle>
              <stat.icon size={18} className={stat.color} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue by Brand */}
      {Object.keys(analytics.byBrand).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Revenue by Brand</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(analytics.byBrand).map(([brand, data]) => (
              <Card key={brand} className="bg-slate-900 border-slate-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-slate-400">{brand}</p>
                  <p className="text-xl font-bold text-white">₱{(data as any).revenue.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{(data as any).count} orders</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Recent Orders</h2>
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-900/50">
                <TableHead className="text-slate-400">Order ID</TableHead>
                <TableHead className="text-slate-400">Brand</TableHead>
                <TableHead className="text-slate-400">Size</TableHead>
                <TableHead className="text-slate-400">Qty</TableHead>
                <TableHead className="text-slate-400">Total</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    No orders yet
                  </TableCell>
                </TableRow>
              ) : (
                orders.slice(0, 10).map((order: any) => (
                  <TableRow key={order._id} className="border-slate-800 hover:bg-slate-900/50">
                    <TableCell className="font-mono text-xs text-slate-400">
                      {order._id.slice(-6)}
                    </TableCell>
                    <TableCell className="text-white">{order.tankBrand}</TableCell>
                    <TableCell className="text-slate-300">{order.tankSize}</TableCell>
                    <TableCell className="text-slate-300">{order.quantity}</TableCell>
                    <TableCell className="text-orange-400 font-semibold">
                      ₱{order.totalPrice}
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
    pending: 'bg-yellow-500/10 text-yellow-400',
    accepted: 'bg-blue-500/10 text-blue-400',
    dispatched: 'bg-purple-500/10 text-purple-400',
    delivered: 'bg-green-500/10 text-green-400',
    cancelled: 'bg-red-500/10 text-red-400',
  }
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${colors[status] || 'bg-slate-800 text-slate-400'}`}>
      {status}
    </span>
  )
}
```

**Step 1:** Create the file.
**Step 2:** Run `pnpm dev` briefly to confirm the route auto-generates. Expected: No errors.

---

### Task 3: Demand Heatmap Page

**Files:**
- Create: `src/routes/_authenticated/merchant/heatmap.tsx`

**What to build:**
A full-height Mapbox map that visualizes order density as a heatmap layer. Fetches recent orders via `getMerchantOrders`, converts their `deliveryLocation.coordinates` into a GeoJSON `FeatureCollection`, and adds it as a Mapbox heatmap source/layer.

This page does NOT reuse the `Map.tsx` component because we need direct access to Mapbox's `addSource`/`addLayer` API for heatmap rendering. We build a self-contained map here.

**Implementation:**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getMerchantOrders } from '@/server/orders.functions'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const DEMO_MERCHANT_ID = '000000000000000000000000'
const DEFAULT_CENTER: [number, number] = [120.9842, 14.5995]

export const Route = createFileRoute('/_authenticated/merchant/heatmap')({
  loader: () => getMerchantOrders({ data: { merchantId: DEMO_MERCHANT_ID } }),
  component: DemandHeatmap,
})

function ordersToGeoJSON(orders: any[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: orders
      .filter((o) => o.deliveryLocation?.coordinates)
      .map((order) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: order.deliveryLocation.coordinates,
        },
        properties: {
          status: order.status,
          totalPrice: order.totalPrice,
        },
      })),
  }
}

function DemandHeatmap() {
  const orders = Route.useLoaderData()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const accessToken =
      import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
      import.meta.env.MAPBOX_ACCESS_TOKEN
    mapboxgl.accessToken = accessToken || ''

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DEFAULT_CENTER,
      zoom: 12,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const geojson = ordersToGeoJSON(orders)

    // Remove existing source/layer if re-rendering
    if (map.current.getSource('orders-heat')) {
      map.current.removeLayer('orders-heat-layer')
      map.current.removeSource('orders-heat')
    }

    map.current.addSource('orders-heat', {
      type: 'geojson',
      data: geojson,
    })

    map.current.addLayer({
      id: 'orders-heat-layer',
      type: 'heatmap',
      source: 'orders-heat',
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'totalPrice'], 0, 0, 5000, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 13, 3],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 13, 20],
        'heatmap-opacity': 0.8,
      },
    })
  }, [orders, mapLoaded])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Demand Heatmap</h1>
        <p className="text-sm text-slate-400 mt-1">
          Visualize where your orders are concentrated. Warmer colors = higher demand.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-800" style={{ height: 'calc(100vh - 200px)' }}>
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>Orders shown: {orders.length}</span>
        <div className="flex items-center gap-2">
          <span>Low</span>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="w-6" style={{ background: 'rgb(103,169,207)' }} />
            <div className="w-6" style={{ background: 'rgb(209,229,240)' }} />
            <div className="w-6" style={{ background: 'rgb(253,219,199)' }} />
            <div className="w-6" style={{ background: 'rgb(239,138,98)' }} />
            <div className="w-6" style={{ background: 'rgb(178,24,43)' }} />
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}
```

**Step 1:** Create the file.
**Step 2:** Run `pnpm dev` briefly to confirm route registration. Expected: No errors.

---

### Task 4: Inventory Management Page

**Files:**
- Create: `src/routes/_authenticated/merchant/inventory.tsx`

**What to build:**
A page to manage the merchant's available tank sizes and accepted brands. Uses `getMerchantById` to load current inventory state, and `updateInventory` to persist changes. Displays:
1. A "Tank Sizes" section with Switch toggles for each standard size (2.7kg, 5kg, 11kg, 22kg, 50kg).
2. A "Brands Accepted" section with Switch toggles for each brand (Gasul, Solane, Petron).
3. A "Save Changes" button that calls `updateInventory` and shows a Sonner toast on success.

**Implementation:**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getMerchantById, updateInventory } from '@/server/merchants.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Package, Save } from 'lucide-react'

const DEMO_MERCHANT_ID = '000000000000000000000000'
const ALL_SIZES = ['2.7kg', '5kg', '11kg', '22kg', '50kg'] as const
const ALL_BRANDS = ['Gasul', 'Solane', 'Petron'] as const

export const Route = createFileRoute('/_authenticated/merchant/inventory')({
  loader: () => getMerchantById({ data: { merchantId: DEMO_MERCHANT_ID } }),
  component: InventoryManagement,
})

function InventoryManagement() {
  const merchant = Route.useLoaderData()

  const [activeSizes, setActiveSizes] = useState<string[]>(
    merchant?.tankSizes ?? []
  )
  const [activeBrands, setActiveBrands] = useState<string[]>(
    merchant?.brandsAccepted ?? []
  )
  const [saving, setSaving] = useState(false)

  const toggleSize = (size: string) => {
    setActiveSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  const toggleBrand = (brand: string) => {
    setActiveBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await updateInventory({
        data: {
          merchantId: DEMO_MERCHANT_ID,
          tankSizes: activeSizes,
          brandsAccepted: activeBrands,
        },
      })
      if (success) {
        toast.success('Inventory updated successfully')
      } else {
        toast.error('Failed to update inventory')
      }
    } catch {
      toast.error('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  if (!merchant) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Package size={48} className="mx-auto mb-4 text-slate-600" />
        <p>Merchant not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Toggle available tank sizes and brands. Changes are visible to customers immediately.
        </p>
      </div>

      {/* Tank Sizes */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Tank Sizes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_SIZES.map((size) => (
            <div key={size} className="flex items-center justify-between">
              <Label htmlFor={`size-${size}`} className="text-slate-300 cursor-pointer">
                {size}
              </Label>
              <Switch
                id={`size-${size}`}
                checked={activeSizes.includes(size)}
                onCheckedChange={() => toggleSize(size)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Brands */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Accepted Brands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_BRANDS.map((brand) => (
            <div key={brand} className="flex items-center justify-between">
              <Label htmlFor={`brand-${brand}`} className="text-slate-300 cursor-pointer">
                {brand}
              </Label>
              <Switch
                id={`brand-${brand}`}
                checked={activeBrands.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-orange-500 hover:bg-orange-600 w-full"
      >
        <Save size={16} className="mr-2" />
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  )
}
```

**Step 1:** Create the file.
**Step 2:** Run `pnpm dev` briefly to confirm route registration.

---

### Task 5: Live Pricing Page

**Files:**
- Create: `src/routes/_authenticated/merchant/pricing.tsx`

**What to build:**
A form interface for merchants to adjust daily prices per brand+size combination. Loads current pricing from `getMerchantById`, displays an editable grid, and saves changes via `updateMerchantPricing`. Shows Sonner toast on success.

**Implementation:**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getMerchantById, updateMerchantPricing } from '@/server/merchants.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DollarSign, Save } from 'lucide-react'

const DEMO_MERCHANT_ID = '000000000000000000000000'

const BRANDS = ['Gasul', 'Solane', 'Petron'] as const
const SIZES = ['2.7kg', '5kg', '11kg', '22kg', '50kg'] as const

export const Route = createFileRoute('/_authenticated/merchant/pricing')({
  loader: () => getMerchantById({ data: { merchantId: DEMO_MERCHANT_ID } }),
  component: PricingManagement,
})

function PricingManagement() {
  const merchant = Route.useLoaderData()

  const [pricing, setPricing] = useState<Record<string, number>>(
    merchant?.pricing ?? {}
  )
  const [saving, setSaving] = useState(false)

  const getKey = (brand: string, size: string) => `${brand}-${size}`

  const handlePriceChange = (brand: string, size: string, value: string) => {
    const num = parseFloat(value)
    if (value === '' || isNaN(num)) {
      const updated = { ...pricing }
      delete updated[getKey(brand, size)]
      setPricing(updated)
      return
    }
    setPricing((prev) => ({ ...prev, [getKey(brand, size)]: num }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await updateMerchantPricing({
        data: {
          merchantId: DEMO_MERCHANT_ID,
          pricing,
        },
      })
      if (success) {
        toast.success('Pricing updated successfully')
      } else {
        toast.error('Failed to update pricing')
      }
    } catch {
      toast.error('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  if (!merchant) {
    return (
      <div className="text-center py-12 text-slate-400">
        <DollarSign size={48} className="mx-auto mb-4 text-slate-600" />
        <p>Merchant not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Live Pricing</h1>
        <p className="text-sm text-slate-400 mt-1">
          Update your daily prices per brand and size. Prices are shown in PHP (₱).
        </p>
      </div>

      {BRANDS.map((brand) => (
        <Card key={brand} className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">{brand}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {SIZES.map((size) => {
                const key = getKey(brand, size)
                return (
                  <div key={key}>
                    <Label htmlFor={key} className="text-xs text-slate-400 mb-1 block">
                      {size}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        ₱
                      </span>
                      <Input
                        id={key}
                        type="number"
                        min={0}
                        step={10}
                        value={pricing[key] ?? ''}
                        onChange={(e) => handlePriceChange(brand, size, e.target.value)}
                        className="pl-7 bg-slate-800 border-slate-700"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-orange-500 hover:bg-orange-600 w-full"
      >
        <Save size={16} className="mr-2" />
        {saving ? 'Saving...' : 'Save All Prices'}
      </Button>
    </div>
  )
}
```

**Step 1:** Create the file.
**Step 2:** Run `pnpm dev` briefly to confirm route registration.

---

### Task 6: Header Update + Route Tree Regeneration + Final Verification

**Files:**
- Modify: `src/components/Header.tsx` (add merchant link)

**What to do:**
1. Add a "Merchant Dashboard" link in the Header sidebar, after the Rider Workspace link. Use `Store` icon from lucide-react. Link to `/merchant/overview`.
2. Run `pnpm dev` to trigger TanStack Router's automatic route tree generation.
3. Verify all 4 merchant pages load without console errors (overview, heatmap, inventory, pricing).
4. Verify sidebar navigation highlights the active route correctly.

---
