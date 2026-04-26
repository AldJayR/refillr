import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
    ArrowLeft,
    MapPin,
    Package,
    Flame,
    Clock,
    Check,
    AlertCircle,
    Store,
    ShieldCheck,
    Home,
    Building,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createRefillRequest } from '@/server/orders.functions'
import { getMerchantById, getNearbyMerchants } from '@/server/merchants.functions'
import { getSavedAddresses } from '@/server/user.functions'
import { toast } from 'sonner'
import { z } from 'zod'
import { TANK_BRANDS, TANK_SIZES, DEFAULT_LOCATION, DEFAULT_SEARCH_RADIUS_METERS } from '@/lib/constants'

const searchSchema = z.object({
    merchantId: z.string().optional(),
    lat: z.number().optional().default(DEFAULT_LOCATION.lat),
    lng: z.number().optional().default(DEFAULT_LOCATION.lng),
})

type Merchant = NonNullable<Awaited<ReturnType<typeof getMerchantById>>>

export const Route = createFileRoute('/_authenticated/order/new')({
    validateSearch: searchSchema,
    loader: async ({ location }) => {
        const { merchantId, lat, lng } = location.search as z.infer<typeof searchSchema>
        const [preselectedMerchant, nearbyMerchants, savedAddresses] = await Promise.all([
            merchantId ? getMerchantById({ data: { merchantId } }) : Promise.resolve(null),
            getNearbyMerchants({ data: { latitude: lat ?? DEFAULT_LOCATION.lat, longitude: lng ?? DEFAULT_LOCATION.lng, radiusMeters: DEFAULT_SEARCH_RADIUS_METERS } }),
            getSavedAddresses().catch(() => []),
        ])
        return { preselectedMerchant, nearbyMerchants, savedAddresses }
    },
    component: NewOrder,
})

interface SavedAddress {
    label: 'home' | 'office' | 'other'
    coordinates: [number, number]
    address: string
    baranggay?: string
    city?: string
    isDefault: boolean
}

const SAVED_ADDR_ICONS: Record<string, typeof MapPin> = {
    home: Home,
    office: Building,
    other: MapPin,
}

function NewOrder() {
    const { preselectedMerchant, nearbyMerchants, savedAddresses: rawSavedAddresses } = Route.useLoaderData()
    const savedAddresses = rawSavedAddresses as SavedAddress[]
    const { lat, lng } = Route.useSearch()

    const [step, setStep] = useState(preselectedMerchant ? 1 : 0)
    const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(
        (preselectedMerchant as Merchant | null) ?? null
    )
    const [selectedBrand, setSelectedBrand] = useState('')
    const [selectedSize, setSelectedSize] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [deliveryAddress, setDeliveryAddress] = useState('')
    const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(
        lat && lng ? [lng, lat] : null
    )
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

    // Derive available brands/sizes and real prices from selected merchant
    const availableBrands = selectedMerchant?.brandsAccepted ?? (TANK_BRANDS as unknown as string[])
    const availableSizes = selectedMerchant?.tankSizes ?? (TANK_SIZES as unknown as string[])

    const getPriceKey = (brand: string, size: string) => `${brand}-${size}`
    const unitPrice =
        selectedMerchant && selectedBrand && selectedSize
            ? (selectedMerchant.pricing?.[getPriceKey(selectedBrand, selectedSize)] ?? 0)
            : 0
    const estimatedPrice = unitPrice * quantity

    const handleUseCurrentLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setDeliveryCoords([pos.coords.longitude, pos.coords.latitude])
                    if (!deliveryAddress) {
                        setDeliveryAddress(`${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`)
                    }
                },
                () => setError('Could not get your location. Please enter your address manually.')
            )
        }
    }

    const handleSubmit = async () => {
        if (!selectedMerchant) {
            setError('No merchant selected. Please go back and select a dealer.')
            return
        }
        setIsSubmitting(true)
        setError(null)

        try {
            const coords: [number, number] = deliveryCoords ?? [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat]

            const orderId = await createRefillRequest({
                data: {
                    merchantId: selectedMerchant._id,
                    tankBrand: selectedBrand as 'Gasul' | 'Solane' | 'Petron',
                    tankSize: selectedSize as '2.7kg' | '5kg' | '11kg' | '22kg' | '50kg',
                    quantity,
                    deliveryLocation: { type: 'Point' as const, coordinates: coords },
                    deliveryAddress,
                }
            })

            if (orderId) {
                setCreatedOrderId(orderId)
                setStep(4)
                toast.success('Order placed successfully!', {
                    description: `Your ${selectedBrand} ${selectedSize} order is being processed.`,
                })
            } else {
                const msg = 'Failed to place order. Please try again.'
                setError(msg)
                toast.error(msg)
            }
        } catch {
            const msg = 'An unexpected error occurred. Please try again.'
            setError(msg)
            toast.error(msg)
        } finally {
            setIsSubmitting(false)
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
                    <h1 className="text-xl font-bold text-foreground">New Refill Order</h1>
                </div>

                <div className="flex items-center justify-between mb-8">
                    {[0, 1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                step >= s ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {step > s ? <Check size={16} /> : s + 1}
                            </div>
                            {s < 3 && (
                                <div className={cn(
                                    "w-16 h-1 mx-2",
                                    step > s ? "bg-orange-500" : "bg-muted"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {step === 0 && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Store size={20} className="text-orange-500" />
                                Select Dealer
                            </h2>

                            {nearbyMerchants.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No nearby dealers found. Please go back and try another area.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                    {nearbyMerchants.map((merchant) => (
                                        <button
                                            key={merchant._id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedMerchant(merchant as Merchant)
                                                setSelectedBrand('')
                                                setSelectedSize('')
                                                setError(null)
                                            }}
                                            className={cn(
                                                'w-full text-left rounded-lg border p-3 transition-colors',
                                                selectedMerchant?._id === merchant._id
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : 'border-border bg-muted/30 hover:bg-muted/50'
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-foreground font-medium">{merchant.shopName}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {(merchant.address || 'Address not listed')}
                                                    </p>
                                                </div>
                                                {merchant.isVerified && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                                                        <ShieldCheck size={14} />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                            disabled={!selectedMerchant}
                            onClick={() => setStep(1)}
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Package size={20} className="text-orange-500" />
                                Select Tank
                            </h2>

                            {selectedMerchant && (
                                <div className="mb-4 rounded-lg bg-muted border border-border p-3">
                                    <p className="text-xs text-muted-foreground">Selected dealer</p>
                                    <p className="text-sm text-foreground font-medium">{selectedMerchant.shopName}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Brand</label>
                                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                        <SelectTrigger className="bg-muted/50 border-border">
                                            <SelectValue placeholder="Select brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableBrands.map((brand) => (
                                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Size</label>
                                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                                        <SelectTrigger className="bg-muted/50 border-border">
                                            <SelectValue placeholder="Select size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSizes.map((size) => (
                                                <SelectItem key={size} value={size}>{size}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Quantity</label>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="border-border"
                                        >
                                            -
                                        </Button>
                                        <span className="text-foreground font-semibold text-xl">{quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="border-border"
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>

                                {unitPrice > 0 && (
                                    <div className="pt-3 border-t border-border">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Unit price</span>
                                            <span className="text-foreground">₱{unitPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-muted-foreground">Subtotal ({quantity}×)</span>
                                            <span className="text-orange-500 font-semibold">₱{estimatedPrice}</span>
                                        </div>
                                    </div>
                                )}

                                {selectedBrand && selectedSize && unitPrice <= 0 && (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-amber-400 text-xs">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <p>This dealer hasn't set a price for {selectedBrand} {selectedSize}. Please select a different dealer or tank.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                            disabled={!selectedBrand || !selectedSize || unitPrice <= 0}
                            onClick={() => setStep(2)}
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <MapPin size={20} className="text-orange-500" />
                                Delivery Location
                            </h2>

                            <div className="space-y-4">
                                {/* Saved Address Picker */}
                                {savedAddresses.length > 0 && (
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-2 block">Saved Addresses</label>
                                        <div className="space-y-2">
                                            {savedAddresses.map((addr) => {
                                                const Icon = SAVED_ADDR_ICONS[addr.label] || MapPin
                                                const fullAddr = [addr.address, addr.baranggay, addr.city]
                                                    .filter(Boolean)
                                                    .join(', ')

                                                return (
                                                    <button
                                                        key={addr.label}
                                                        type="button"
                                                        onClick={() => {
                                                            setDeliveryCoords(addr.coordinates)
                                                            setDeliveryAddress(fullAddr)
                                                            setError(null)
                                                        }}
                                                        className={cn(
                                                            'w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors',
                                                            deliveryAddress === fullAddr
                                                                ? 'border-orange-500 bg-orange-500/10'
                                                                : 'border-border bg-muted/30 hover:bg-muted/50'
                                                        )}
                                                    >
                                                        <Icon size={16} className="text-orange-500 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm text-foreground font-medium capitalize">{addr.label}</p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {[addr.address, addr.baranggay, addr.city].filter(Boolean).join(', ')}
                                                            </p>
                                                        </div>
                                                        {addr.isDefault && (
                                                            <span className="ml-auto text-xs text-orange-400 shrink-0">Default</span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <div className="relative my-3">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-border" />
                                            </div>
                                            <div className="relative flex justify-center text-xs">
                                                <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Address</label>
                                    <Input
                                        placeholder="Enter your delivery address"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        className="bg-muted/50 border-border"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    className="w-full bg-muted border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-accent transition-colors cursor-pointer"
                                >
                                    <MapPin size={16} className="text-orange-500" />
                                    <span className="text-sm text-muted-foreground">
                                        {deliveryCoords ? '📍 Location captured' : 'Use current location'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Clock size={20} className="text-orange-500" />
                                Estimated Time
                            </h2>
                            <p className="text-muted-foreground">Delivery within 30 minutes</p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-border"
                                onClick={() => setStep(1)}
                            >
                                Back
                            </Button>
                            <Button
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                                disabled={!deliveryAddress}
                                onClick={() => setStep(3)}
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Flame size={20} className="text-orange-500" />
                                Order Summary
                            </h2>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Brand</span>
                                    <span className="text-foreground">{selectedBrand}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Size</span>
                                    <span className="text-foreground">{selectedSize}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Quantity</span>
                                    <span className="text-foreground">{quantity}</span>
                                </div>
                                <div className="border-t border-border pt-3 flex justify-between">
                                    <span className="text-muted-foreground">Delivery Address</span>
                                    <span className="text-foreground text-right max-w-[150px]">{deliveryAddress}</span>
                                </div>
                                <div className="border-t border-border pt-3 flex justify-between">
                                    <span className="text-foreground font-semibold">Estimated Total</span>
                                    <span className="text-orange-500 font-bold text-xl">₱{estimatedPrice}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-border"
                                onClick={() => setStep(2)}
                            >
                                Back
                            </Button>
                            <Button
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                            >
                                {isSubmitting ? 'Processing...' : 'Place Order'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Order Placed!</h2>
                        <p className="text-muted-foreground mb-2">
                            Your order has been sent to nearby merchants. You'll be notified when a rider accepts your order.
                        </p>
                        {createdOrderId && (
                            <p className="text-xs text-muted-foreground mb-6 font-mono">Order ID: {createdOrderId}</p>
                        )}
                        <div className="space-y-3">
                            <Link to="/orders">
                                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                                    View Order Status
                                </Button>
                            </Link>
                            <Link to="/">
                                <Button variant="outline" className="w-full border-border">
                                    Back to Home
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
