import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getMerchantById, updateInventory } from '@/server/merchants.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Package, Save } from 'lucide-react'
import { TANK_SIZES as ALL_SIZES, TANK_BRANDS as ALL_BRANDS } from '@/lib/constants'

export const Route = createFileRoute('/_authenticated/merchant/inventory')({
  loader: ({ context }) => {
    const merchantId = (context as any).merchantId as string
    return getMerchantById({ data: { merchantId } })
  },
  component: InventoryManagement,
})

function InventoryManagement() {
  const merchant = Route.useLoaderData()
  const { merchantId } = Route.useRouteContext() as any

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
          merchantId,
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
