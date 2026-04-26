import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { createMerchant, getMyMerchant } from '@/server/merchants.functions'
import { getMyAccountStatus } from '@/server/user.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Flame, MapPin, Store, ChevronRight, ChevronLeft } from 'lucide-react'
import Map from '@/components/Map'

const ALL_SIZES = ['2.7kg', '5kg', '11kg', '22kg', '50kg'] as const
const ALL_BRANDS = ['Gasul', 'Solane', 'Petron'] as const

export const Route = createFileRoute('/_authenticated/merchant-setup')({
  loader: async () => {
    const [merchant, accountStatus] = await Promise.all([
      getMyMerchant(), 
      getMyAccountStatus({} as { data: undefined })
    ])
    if (merchant || accountStatus?.hasRider) {
      throw redirect({ to: '/merchant/overview' })
    }
    return { merchant, accountStatus }
  },
  component: MerchantSetup,
})

function MerchantSetup() {
  return <SetupWizard />
}

function SetupWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Basic info
  const [shopName, setShopName] = useState('')
  const [doePermitNumber, setDoePermitNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  // Step 2: Location
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)
  const [address, setAddress] = useState('')
  const [baranggay, setBaranggay] = useState('')
  const [city, setCity] = useState('')

  // Step 3: Inventory
  const [tankSizes, setTankSizes] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])

  const toggleSize = (size: string) => {
    setTankSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  const toggleBrand = (brand: string) => {
    setBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  const canProceedStep1 = shopName.trim() && doePermitNumber.trim()
  const canProceedStep2 = coordinates !== null && address.trim()
  const canSubmit = canProceedStep1 && canProceedStep2 && brands.length > 0 && tankSizes.length > 0

  const handleMapClick = (coords: [number, number]) => {
    setCoordinates(coords)
  }

  const handleSubmit = async () => {
    if (!canSubmit || !coordinates) return

    setSubmitting(true)
    try {
      await createMerchant({
        data: {
          shopName: shopName.trim(),
          doePermitNumber: doePermitNumber.trim(),
          location: {
            type: 'Point',
            coordinates: coordinates,
          },
          phoneNumber: phoneNumber.trim() || undefined,
          address: address.trim(),
          baranggay: baranggay.trim() || undefined,
          city: city.trim() || undefined,
          brandsAccepted: brands,
          tankSizes: tankSizes,
          pricing: {},
          isOpen: true,
          isVerified: false,
          deliveryRadiusMeters: 5000,
        },
      })
      toast.success('Store profile created! Welcome to Refillr.')
      navigate({ to: '/merchant/overview' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create store profile'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <Flame className="text-orange-500" size={28} />
            <h1 className="text-2xl font-bold text-gradient font-heading">Register Your Store</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Set up your LPG dealer profile in 3 easy steps
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s
                    ? 'bg-orange-500 text-white'
                    : step > s
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? '\u2713' : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 ${step > s ? 'bg-emerald-500/50' : 'bg-muted'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Store size={20} className="text-orange-500" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shopName" className="text-foreground">
                  Shop Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="shopName"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Juan's LPG Supply"
                  className="bg-muted/50 border-border mt-1"
                />
              </div>

              <div>
                <Label htmlFor="doePermit" className="text-foreground">
                  DOE Permit Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="doePermit"
                  value={doePermitNumber}
                  onChange={(e) => setDoePermitNumber(e.target.value)}
                  placeholder="e.g. DOE-LPG-2024-XXXXX"
                  className="bg-muted/50 border-border mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for DOE-verified badge
                </p>
              </div>

              <div>
                <Label htmlFor="phone" className="text-foreground">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="bg-muted/50 border-border mt-1"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <MapPin size={20} className="text-orange-500" />
                Store Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Click on the map to set your store location
                </p>
                <div className="rounded-lg overflow-hidden border border-border" style={{ height: 300 }}>
                  <Map
                    center={coordinates || undefined}
                    zoom={14}
                    onMapClick={handleMapClick}
                    markers={
                      coordinates
                        ? [
                            {
                              id: 'store-pin',
                              coordinates: coordinates,
                              shopName: shopName || 'Your Store',
                              isVerified: false,
                              isOpen: true,
                            },
                          ]
                        : []
                    }
                  />
                </div>
                {coordinates && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinates: {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="address" className="text-foreground">
                  Street Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Rizal St."
                  className="bg-muted/50 border-border mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="baranggay" className="text-foreground">
                    Barangay
                  </Label>
                  <Input
                    id="baranggay"
                    value={baranggay}
                    onChange={(e) => setBaranggay(e.target.value)}
                    placeholder="e.g. Brgy. San Jose"
                    className="bg-muted/50 border-border mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-foreground">
                    City / Municipality
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Quezon City"
                    className="bg-muted/50 border-border mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="border-border text-foreground"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Inventory & Submit */}
        {step === 3 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Flame size={20} className="text-orange-500" />
                Brands & Tank Sizes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brands */}
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Select the brands you carry <span className="text-rose-500">*</span>
                </p>
                <div className="space-y-3">
                  {ALL_BRANDS.map((brand) => (
                    <div key={brand} className="flex items-center justify-between">
                      <Label htmlFor={`brand-${brand}`} className="text-foreground cursor-pointer">
                        {brand}
                      </Label>
                      <Switch
                        id={`brand-${brand}`}
                        checked={brands.includes(brand)}
                        onCheckedChange={() => toggleBrand(brand)}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tank Sizes */}
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Select available tank sizes <span className="text-rose-500">*</span>
                </p>
                <div className="space-y-3">
                  {ALL_SIZES.map((size) => (
                    <div key={size} className="flex items-center justify-between">
                      <Label htmlFor={`size-${size}`} className="text-foreground cursor-pointer">
                        {size}
                      </Label>
                      <Switch
                        id={`size-${size}`}
                        checked={tankSizes.includes(size)}
                        onCheckedChange={() => toggleSize(size)}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="border-border text-foreground"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting ? 'Creating...' : 'Create Store Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
