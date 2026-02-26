import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getMerchantById, updateMerchantPricing } from '@/server/merchants.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DollarSign, Save } from 'lucide-react'

const BRANDS = ['Gasul', 'Solane', 'Petron'] as const
const SIZES = ['2.7kg', '5kg', '11kg', '22kg', '50kg'] as const

export const Route = createFileRoute('/_authenticated/merchant/pricing')({
  loader: ({ context }) => {
    const merchantId = (context as any).merchantId as string
    return getMerchantById({ data: { merchantId } })
  },
  component: PricingManagement,
})

function PricingManagement() {
  const merchant = Route.useLoaderData()
  const { merchantId } = Route.useRouteContext() as any

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
          merchantId,
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
