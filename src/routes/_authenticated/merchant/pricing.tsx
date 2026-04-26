import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getMerchantById, updateMerchantPricing } from '@/server/merchants.functions'
import { getDOEPrices } from '@/server/doe.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DollarSign, Save, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TANK_BRANDS as BRANDS, TANK_SIZES as SIZES } from '@/lib/constants'
import type { Merchant } from '@/lib/schemas'

export const Route = createFileRoute('/_authenticated/merchant/pricing')({
  loader: async ({ context }) => {
    const { merchantId } = context as { merchantId: string }
    const [merchant, doeConfig] = await Promise.all([
      getMerchantById({ data: { merchantId } }) as Promise<Merchant>,
      getDOEPrices(),
    ])
    return { merchant, doeConfig }
  },
  component: PricingManagement,
})

type ComplianceStatus = 'compliant' | 'near-limit' | 'overpriced' | 'no-data'

function getComplianceStatus(
  price: number | undefined,
  srp: number | undefined,
  maxPrice: number | undefined
): ComplianceStatus {
  if (!price || !srp || !maxPrice) return 'no-data'
  if (price > maxPrice) return 'overpriced'
  if (price >= maxPrice * 0.9) return 'near-limit'
  return 'compliant'
}

const COMPLIANCE_CONFIG: Record<ComplianceStatus, {
  border: string
  icon: typeof CheckCircle
  color: string
  label: string
}> = {
  compliant: { border: 'border-emerald-500/50', icon: CheckCircle, color: 'text-emerald-500', label: 'Fair Price' },
  'near-limit': { border: 'border-amber-500/50', icon: AlertTriangle, color: 'text-amber-500', label: 'Near Limit' },
  overpriced: { border: 'border-rose-500/50', icon: XCircle, color: 'text-rose-500', label: 'Over Max' },
  'no-data': { border: 'border-border', icon: DollarSign, color: 'text-muted-foreground', label: '' },
}

interface DOEPricelistEntry {
  brand: string
  size: string
  suggestedRetailPrice: number
  maxRetailPrice: number
}

function PricingManagement() {
  const { merchant, doeConfig } = Route.useLoaderData()
  const { merchantId } = Route.useRouteContext() as { merchantId: string }

  const [pricing, setPricing] = useState<Record<string, number>>(
    merchant?.pricing ?? {}
  )
  const [saving, setSaving] = useState(false)

  const getKey = (brand: string, size: string) => `${brand}-${size}`

  // Build DOE lookup map
  const doeLookup: Record<string, { suggestedRetailPrice: number; maxRetailPrice: number }> = {}
  if (doeConfig?.prices) {
    for (const entry of (doeConfig.prices as unknown as DOEPricelistEntry[])) {
      doeLookup[`${entry.brand}-${entry.size}`] = {
        suggestedRetailPrice: entry.suggestedRetailPrice,
        maxRetailPrice: entry.maxRetailPrice,
      }
    }
  }

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
        data: { merchantId, pricing },
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
      <div className="text-center py-12 text-muted-foreground">
        <DollarSign size={48} className="mx-auto mb-4 text-muted-foreground/30" />
        <p>Merchant not found</p>
      </div>
    )
  }

  // Compliance summary
  let compliantCount = 0
  let totalPriced = 0
  for (const brand of BRANDS) {
    for (const size of SIZES) {
      const key = getKey(brand, size)
      if (pricing[key]) {
        totalPriced++
        const doe = doeLookup[key]
        const status = getComplianceStatus(pricing[key], doe?.suggestedRetailPrice, doe?.maxRetailPrice)
        if (status === 'compliant') compliantCount++
      }
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Live Pricing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your daily prices per brand and size. Prices are shown in PHP (₱).
        </p>
      </div>

      {/* DOE Compliance Summary */}
      {doeConfig && totalPriced > 0 && (
        <Card className={cn(
          'border',
          compliantCount === totalPriced
            ? 'bg-emerald-500/5 border-emerald-500/30'
            : 'bg-amber-500/5 border-amber-500/30'
        )}>
          <CardContent className="pt-4 flex items-center gap-3">
            {compliantCount === totalPriced ? (
              <CheckCircle size={20} className="text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            )}
            <div>
              <p className="text-sm text-foreground font-medium">
                DOE Compliance: {compliantCount}/{totalPriced} prices within fair range
              </p>
              <p className="text-xs text-muted-foreground">
                Rates effective {new Date(doeConfig.effectiveDate).toLocaleDateString('en-PH')} ({doeConfig.weekLabel})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {BRANDS.map((brand) => (
        <Card key={brand} className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{brand}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {SIZES.map((size) => {
                const key = getKey(brand, size)
                const doe = doeLookup[key]
                const status = getComplianceStatus(pricing[key], doe?.suggestedRetailPrice, doe?.maxRetailPrice)
                const cfg = COMPLIANCE_CONFIG[status]
                const StatusIcon = cfg.icon

                return (
                  <div key={key}>
                    <Label htmlFor={key} className="text-xs text-muted-foreground mb-1 block">
                      {size}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        ₱
                      </span>
                      <Input
                        id={key}
                        type="number"
                        min={0}
                        step={10}
                        value={pricing[key] ?? ''}
                        onChange={(e) => handlePriceChange(brand, size, e.target.value)}
                        className={cn('pl-7 bg-muted/50', cfg.border)}
                        placeholder="0"
                      />
                    </div>
                    {doe && (
                      <div className="mt-1 flex items-center gap-1">
                        <StatusIcon size={11} className={cfg.color} />
                        <span className={cn('text-[10px] leading-tight', cfg.color)}>
                          {cfg.label ? `${cfg.label} · ` : ''}SRP ₱{doe.suggestedRetailPrice}
                        </span>
                      </div>
                    )}
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
        className="bg-orange-500 hover:bg-orange-600 text-white w-full"
      >
        <Save size={16} className="mr-2" />
        {saving ? 'Saving...' : 'Save All Prices'}
      </Button>
    </div>
  )
}
