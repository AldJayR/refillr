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
    AlertCircle
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

export const Route = createFileRoute('/_authenticated/order/new')({
    component: NewOrder,
})

const TANK_BRANDS = ['Gasul', 'Solane', 'Petron'] as const
const TANK_SIZES = ['2.7kg', '5kg', '11kg', '22kg', '50kg'] as const

const PRICE_MAP: Record<string, Record<string, number>> = {
    '2.7kg': { Gasul: 350, Solane: 340, Petron: 330 },
    '5kg': { Gasul: 600, Solane: 580, Petron: 570 },
    '11kg': { Gasul: 1200, Solane: 1150, Petron: 1100 },
    '22kg': { Gasul: 2200, Solane: 2100, Petron: 2050 },
    '50kg': { Gasul: 4800, Solane: 4600, Petron: 4500 },
}

function NewOrder() {
    const [step, setStep] = useState(1)
    const [selectedBrand, setSelectedBrand] = useState('')
    const [selectedSize, setSelectedSize] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [deliveryAddress, setDeliveryAddress] = useState('')
    const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

    const unitPrice = selectedBrand && selectedSize
        ? PRICE_MAP[selectedSize]?.[selectedBrand] ?? 0
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
        setIsSubmitting(true)
        setError(null)

        try {
            // Use delivery coordinates or fallback to Manila default
            const coords: [number, number] = deliveryCoords ?? [120.9842, 14.5995]

            const orderId = await createRefillRequest({
                data: {
                    merchantId: '000000000000000000000000', // In production, use selected merchant
                    tankBrand: selectedBrand as 'Gasul' | 'Solane' | 'Petron',
                    tankSize: selectedSize as '2.7kg' | '5kg' | '11kg' | '22kg' | '50kg',
                    quantity,
                    totalPrice: estimatedPrice,
                    deliveryLocation: {
                        type: 'Point' as const,
                        coordinates: coords,
                    },
                    deliveryAddress,
                }
            })

            if (orderId) {
                setCreatedOrderId(orderId)
                setStep(4)
            } else {
                setError('Failed to place order. Please try again.')
            }
        } catch {
            setError('An unexpected error occurred. Please try again.')
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
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                step >= s ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-400"
                            )}>
                                {step > s ? <Check size={16} /> : s}
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

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Package size={20} className="text-orange-500" />
                                Select Tank
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Brand</label>
                                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700">
                                            <SelectValue placeholder="Select brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TANK_BRANDS.map((brand) => (
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
                                            {TANK_SIZES.map((size) => (
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
                            disabled={!selectedBrand || !selectedSize}
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
