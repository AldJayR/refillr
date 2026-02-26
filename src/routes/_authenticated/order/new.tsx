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
        const [preselectedMerchant, nearbyMerchants] = await Promise.all([
            merchantId ? getMerchantById({ data: { merchantId } }) : Promise.resolve(null),
            getNearbyMerchants({ data: { latitude: lat ?? DEFAULT_LOCATION.lat, longitude: lng ?? DEFAULT_LOCATION.lng, radiusMeters: DEFAULT_SEARCH_RADIUS_METERS } }),
        ])
        return { preselectedMerchant, nearbyMerchants }
    },
    component: NewOrder,
})

function NewOrder() {
    const { preselectedMerchant, nearbyMerchants } = Route.useLoaderData()
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
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link to="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-white">New Refill Order</h1>
                </div>

                <div className="flex items-center justify-between mb-8">
                    {[0, 1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                step >= s ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-400"
                            )}>
                                {step > s ? <Check size={16} /> : s + 1}
                            </div>
                            {s < 3 && (
                                <div className={cn(
                                    "w-16 h-1 mx-2",
                                    step > s ? "bg-orange-500" : "bg-slate-800"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {step === 0 && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Store size={20} className="text-orange-500" />
                                Select Dealer
                            </h2>

                            {nearbyMerchants.length === 0 ? (
                                <div className="text-sm text-slate-400">
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
                                                    : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-white font-medium">{merchant.shopName}</p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {(merchant.address || 'Address not listed')}
                                                    </p>
                                                </div>
                                                {merchant.isVerified && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
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
                            className="w-full bg-orange-500 hover:bg-orange-600"
                            disabled={!selectedMerchant}
                            onClick={() => setStep(1)}
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Package size={20} className="text-orange-500" />
                                Select Tank
                            </h2>

                            {selectedMerchant && (
                                <div className="mb-4 rounded-lg bg-slate-800/60 border border-slate-700 p-3">
                                    <p className="text-xs text-slate-400">Selected dealer</p>
                                    <p className="text-sm text-white font-medium">{selectedMerchant.shopName}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Brand</label>
                                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700">
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
                                    <label className="text-sm text-slate-400 mb-2 block">Size</label>
                                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700">
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
                                    <label className="text-sm text-slate-400 mb-2 block">Quantity</label>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="border-slate-700"
                                        >
                                            -
                                        </Button>
                                        <span className="text-white font-semibold text-xl">{quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="border-slate-700"
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>

                                {unitPrice > 0 && (
                                    <div className="pt-3 border-t border-slate-700">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Unit price</span>
                                            <span className="text-white">₱{unitPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-slate-400">Subtotal ({quantity}×)</span>
                                            <span className="text-orange-500 font-semibold">₱{estimatedPrice}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            className="w-full bg-orange-500 hover:bg-orange-600"
                            disabled={!selectedBrand || !selectedSize || unitPrice <= 0}
                            onClick={() => setStep(2)}
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <MapPin size={20} className="text-orange-500" />
                                Delivery Location
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Address</label>
                                    <Input
                                        placeholder="Enter your delivery address"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        className="bg-slate-800 border-slate-700"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    className="w-full bg-slate-800 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                    <MapPin size={16} className="text-orange-500" />
                                    <span className="text-sm text-slate-300">
                                        {deliveryCoords ? '📍 Location captured' : 'Use current location'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Clock size={20} className="text-orange-500" />
                                Estimated Time
                            </h2>
                            <p className="text-slate-300">Delivery within 30 minutes</p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700"
                                onClick={() => setStep(1)}
                            >
                                Back
                            </Button>
                            <Button
                                className="flex-1 bg-orange-500 hover:bg-orange-600"
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
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Flame size={20} className="text-orange-500" />
                                Order Summary
                            </h2>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Brand</span>
                                    <span className="text-white">{selectedBrand}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Size</span>
                                    <span className="text-white">{selectedSize}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Quantity</span>
                                    <span className="text-white">{quantity}</span>
                                </div>
                                <div className="border-t border-slate-700 pt-3 flex justify-between">
                                    <span className="text-slate-400">Delivery Address</span>
                                    <span className="text-white text-right max-w-[150px]">{deliveryAddress}</span>
                                </div>
                                <div className="border-t border-slate-700 pt-3 flex justify-between">
                                    <span className="text-white font-semibold">Estimated Total</span>
                                    <span className="text-orange-500 font-bold text-xl">₱{estimatedPrice}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700"
                                onClick={() => setStep(2)}
                            >
                                Back
                            </Button>
                            <Button
                                className="flex-1 bg-orange-500 hover:bg-orange-600"
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
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Order Placed!</h2>
                        <p className="text-slate-400 mb-2">
                            Your order has been sent to nearby merchants. You'll be notified when a rider accepts your order.
                        </p>
                        {createdOrderId && (
                            <p className="text-xs text-slate-500 mb-6 font-mono">Order ID: {createdOrderId}</p>
                        )}
                        <div className="space-y-3">
                            <Link to="/orders">
                                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                                    View Order Status
                                </Button>
                            </Link>
                            <Link to="/">
                                <Button variant="outline" className="w-full border-slate-700">
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
