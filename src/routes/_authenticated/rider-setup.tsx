import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bike, User, FileText, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { createRider } from '@/server/rider.functions'

export const Route = createFileRoute('/_authenticated/rider-setup')({
  component: RiderSetup,
})

const VEHICLE_TYPES = [
  { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
  { value: 'bicycle', label: 'Bicycle', icon: '🚲' },
  { value: 'sidecar', label: 'Sidecar', icon: '🛺' },
] as const

function RiderSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'bicycle' | 'sidecar'>('motorcycle')
  const [plateNumber, setPlateNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')

  const canProceedStep1 = firstName.trim() && lastName.trim() && phoneNumber.trim()

  const handleSubmit = async () => {
    if (!canProceedStep1) return
    setSubmitting(true)
    try {
      await createRider({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          vehicleType,
          plateNumber: plateNumber.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
        },
      })
      toast.success('Rider profile created!', {
        description: 'Welcome to the Refillr rider team.',
      })
      navigate({ to: '/rider' })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create rider profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white font-heading">Join as a Rider</h1>
          <p className="text-slate-400 mt-2">Register your vehicle and start earning</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  s < step
                    ? 'bg-orange-500 text-white'
                    : s === step
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {s < step ? <CheckCircle size={16} /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 ${s < step ? 'bg-orange-500' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User size={20} className="text-orange-500" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-slate-800 border-slate-700 mt-1"
                  placeholder="Juan"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-slate-800 border-slate-700 mt-1"
                  placeholder="Dela Cruz"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-slate-800 border-slate-700 mt-1"
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                Next: Vehicle Details
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Vehicle */}
        {step === 2 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bike size={20} className="text-orange-500" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Vehicle Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  {VEHICLE_TYPES.map((v) => (
                    <button
                      key={v.value}
                      onClick={() => setVehicleType(v.value)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        vehicleType === v.value
                          ? 'border-orange-500 bg-orange-500/10 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{v.icon}</span>
                      <span className="text-xs">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="plate" className="text-slate-300">Plate Number (optional)</Label>
                <Input
                  id="plate"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  className="bg-slate-800 border-slate-700 mt-1"
                  placeholder="ABC 1234"
                />
              </div>
              <div>
                <Label htmlFor="license" className="text-slate-300">License Number (optional)</Label>
                <Input
                  id="license"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="bg-slate-800 border-slate-700 mt-1"
                  placeholder="N01-23-456789"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-slate-700">
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  Next: Review
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText size={20} className="text-orange-500" />
                Review & Submit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Name</span>
                  <span className="text-white">{firstName} {lastName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-white">{phoneNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Vehicle</span>
                  <span className="text-white capitalize">{vehicleType}</span>
                </div>
                {plateNumber && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Plate</span>
                    <span className="text-white">{plateNumber}</span>
                  </div>
                )}
                {licenseNumber && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">License</span>
                    <span className="text-white">{licenseNumber}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-slate-700">
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {submitting ? 'Creating...' : 'Register as Rider'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
