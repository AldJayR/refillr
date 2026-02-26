import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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

type RiderVehicleType = (typeof VEHICLE_TYPES)[number]['value']

function getFieldErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return null
}

function RiderSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      vehicleType: 'motorcycle' as RiderVehicleType,
      plateNumber: '',
      licenseNumber: '',
    },
    onSubmit: async ({ value }) => {
      try {
        await createRider({
          data: {
            firstName: value.firstName.trim(),
            lastName: value.lastName.trim(),
            phoneNumber: value.phoneNumber.trim(),
            vehicleType: value.vehicleType,
            plateNumber: value.plateNumber.trim() || undefined,
            licenseNumber: value.licenseNumber.trim() || undefined,
          },
        })
        toast.success('Rider profile created!', {
          description: 'Welcome to the Refillr rider team.',
        })
        navigate({ to: '/rider' })
      } catch (error: any) {
        toast.error(error?.message || 'Failed to create rider profile')
      }
    },
  })

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
              <FieldGroup>
                <form.Field
                  name="firstName"
                  validators={{
                    onChange: ({ value }) =>
                      value.trim().length > 0 ? undefined : 'First name is required',
                  }}
                >
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    const errorMessage = getFieldErrorMessage(field.state.meta.errors[0])

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="firstName" className="text-slate-300">
                          First Name
                        </FieldLabel>
                        <Input
                          id="firstName"
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="bg-slate-800 border-slate-700 mt-1"
                          placeholder="Juan"
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && errorMessage && <FieldError>{errorMessage}</FieldError>}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field
                  name="lastName"
                  validators={{
                    onChange: ({ value }) =>
                      value.trim().length > 0 ? undefined : 'Last name is required',
                  }}
                >
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    const errorMessage = getFieldErrorMessage(field.state.meta.errors[0])

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="lastName" className="text-slate-300">
                          Last Name
                        </FieldLabel>
                        <Input
                          id="lastName"
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="bg-slate-800 border-slate-700 mt-1"
                          placeholder="Dela Cruz"
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && errorMessage && <FieldError>{errorMessage}</FieldError>}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field
                  name="phoneNumber"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value.trim()) return 'Phone number is required'
                      if (value.trim().length < 10) return 'Enter a valid phone number'
                      return undefined
                    },
                  }}
                >
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    const errorMessage = getFieldErrorMessage(field.state.meta.errors[0])

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="phone" className="text-slate-300">
                          Phone Number
                        </FieldLabel>
                        <Input
                          id="phone"
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="bg-slate-800 border-slate-700 mt-1"
                          placeholder="+63 9XX XXX XXXX"
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && errorMessage && <FieldError>{errorMessage}</FieldError>}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Subscribe selector={(state) => state.values}>
                  {(values) => {
                    const canProceedStep1 =
                      values.firstName.trim().length > 0 &&
                      values.lastName.trim().length > 0 &&
                      values.phoneNumber.trim().length > 0

                    return (
                      <Button
                        onClick={() => setStep(2)}
                        disabled={!canProceedStep1}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                      >
                        Next: Vehicle Details
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    )
                  }}
                </form.Subscribe>
              </FieldGroup>
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
              <FieldGroup>
                <form.Field name="vehicleType">
                  {(field) => (
                    <Field>
                      <FieldLabel className="text-slate-300 mb-2 block">Vehicle Type</FieldLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {VEHICLE_TYPES.map((v) => (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => field.handleChange(v.value)}
                            className={`p-3 rounded-lg border text-center transition-colors ${
                              field.state.value === v.value
                                ? 'border-orange-500 bg-orange-500/10 text-white'
                                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span className="text-2xl block mb-1">{v.icon}</span>
                            <span className="text-xs">{v.label}</span>
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}
                </form.Field>

                <form.Field name="plateNumber">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="plate" className="text-slate-300">
                        Plate Number (optional)
                      </FieldLabel>
                      <Input
                        id="plate"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="bg-slate-800 border-slate-700 mt-1"
                        placeholder="ABC 1234"
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="licenseNumber">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="license" className="text-slate-300">
                        License Number (optional)
                      </FieldLabel>
                      <Input
                        id="license"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="bg-slate-800 border-slate-700 mt-1"
                        placeholder="N01-23-456789"
                      />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>

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
              <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
                {([values, isSubmitting]) => (
                  <>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400">Name</span>
                        <span className="text-white">{values.firstName} {values.lastName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400">Phone</span>
                        <span className="text-white">{values.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400">Vehicle</span>
                        <span className="text-white capitalize">{values.vehicleType}</span>
                      </div>
                      {values.plateNumber && (
                        <div className="flex justify-between py-2 border-b border-slate-800">
                          <span className="text-slate-400">Plate</span>
                          <span className="text-white">{values.plateNumber}</span>
                        </div>
                      )}
                      {values.licenseNumber && (
                        <div className="flex justify-between py-2 border-b border-slate-800">
                          <span className="text-slate-400">License</span>
                          <span className="text-white">{values.licenseNumber}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-slate-700">
                        <ArrowLeft size={16} className="mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={() => form.handleSubmit()}
                        disabled={isSubmitting}
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                      >
                        {isSubmitting ? 'Creating...' : 'Register as Rider'}
                      </Button>
                    </div>
                  </>
                )}
              </form.Subscribe>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
