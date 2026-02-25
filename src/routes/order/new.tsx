import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { 
  ArrowLeft,
  MapPin,
  Package,
  Flame,
  Clock,
  Check
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

export const Route = createFileRoute('/order/new')({
  component: NewOrder,
})

const TANK_BRANDS = ['Gasul', 'Solane', 'Petron', 'LPG']
const TANK_SIZES = ['2.7kg', '5kg', '11kg', '22kg', '50kg']

function NewOrder() {
  const [step, setStep] = useState(1)
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const estimatedPrice = selectedBrand && selectedSize 
    ? (selectedSize === '11kg' ? 1200 : selectedSize === '5kg' ? 600 : 2000) * quantity
    : 0

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setStep(4)
    setIsSubmitting(false)
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

                <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
                  <MapPin size={16} className="text-orange-500" />
                  <span className="text-sm text-slate-300">Use current location</span>
                </div>
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
            <p className="text-slate-400 mb-6">
              Your order has been sent to nearby merchants. You'll be notified when a rider accepts your order.
            </p>
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
