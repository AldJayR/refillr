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

export const Route = createFileRoute('/_authenticated/merchant/pricing')({
  loader: async ({ context }) => {
    const merchantId = (context as any).merchantId as string
    const [merchant, doeConfig] = await Promise.all([
      getMerchantById({ data: { merchantId } }),
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
  compliant: { border: 'border-green-500/50', icon: CheckCircle, color: 'text-green-500', label: 'Fair Price' },
  'near-limit': { border: 'border-yellow-500/50', icon: AlertTriangle, color: 'text-yellow-500', label: 'Near Limit' },
  overpriced: { border: 'border-red-500/50', icon: XCircle, color: 'text-red-500', label: 'Over Max' },
  'no-data': { border: 'border-slate-700', icon: DollarSign, color: 'text-slate-500', label: '' },
}

function PricingManagement() {
  const { merchant, doeConfig } = Route.useLoaderData()
  const { merchantId } = Route.useRouteContext() as any

  const [pricing, setPricing] = useState<Record<string, number>>(
    merchant?.pricing ?? {}
  )
  const [saving, setSaving] = useState(false)

  const getKey = (brand: string, size: string) => `${brand}-${size}`

  // Build DOE lookup map
  const doeLookup: Record<string, { suggestedRetailPrice: number; maxRetailPrice: number }> = {}
  if (doeConfig?.prices) {
    for (const entry of doeConfig.prices as any[]) {
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
      <div className="text-center py-12 text-slate-400">
        <DollarSign size={48} className="mx-auto mb-4 text-slate-600" />
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
        <h1 className="text-2xl font-bold text-white">Live Pricing</h1>
        <p className="text-sm text-slate-400 mt-1">
          Update your daily prices per brand and size. Prices are shown in PHP (₱).
        </p>
      </div>

      {/* DOE Compliance Summary */}
      {doeConfig && totalPriced > 0 && (
        <Card className={cn(
          'border',
          compliantCount === totalPriced
            ? 'bg-green-500/5 border-green-500/30'
            : 'bg-yellow-500/5 border-yellow-500/30'
        )}>
          <CardContent className="pt-4 flex items-center gap-3">
            {compliantCount === totalPriced ? (
              <CheckCircle size={20} className="text-green-500 shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-yellow-500 shrink-0" />
            )}
            <div>
              <p className="text-sm text-white font-medium">
                DOE Compliance: {compliantCount}/{totalPriced} prices within fair range
              </p>
              <p className="text-xs text-slate-400">
                Rates effective {new Date(doeConfig.effectiveDate as any).toLocaleDateString('en-PH')} ({doeConfig.weekLabel})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {BRANDS.map((brand) => (
        <Card key={brand} className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">{brand}</CardTitle>
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
                        className={cn('pl-7 bg-slate-800', cfg.border)}
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
        className="bg-orange-500 hover:bg-orange-600 w-full"
      >
        <Save size={16} className="mr-2" />
        {saving ? 'Saving...' : 'Save All Prices'}
      </Button>
    </div>
  )
}
