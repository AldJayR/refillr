import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
    ArrowLeft,
    MapPin,
    Home,
    Building,
    Plus,
    Trash2,
    Star,
    Crosshair,
    Loader2,
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
import { getSavedAddresses, saveAddress, deleteAddress } from '@/server/user.functions'
import { DEFAULT_LOCATION } from '@/lib/constants'

export const Route = createFileRoute('/_authenticated/profile')({
    loader: () => getSavedAddresses(),
    component: ProfilePage,
})

interface SavedAddress {
    label: 'home' | 'office' | 'other'
    coordinates: [number, number]
    address: string
    baranggay?: string
    city?: string
    isDefault: boolean
}

const LABEL_ICONS = {
    home: Home,
    office: Building,
    other: MapPin,
}

const LABEL_COLORS = {
    home: 'text-blue-400',
    office: 'text-purple-400',
    other: 'text-slate-400',
}

function ProfilePage() {
    const loaderAddresses = Route.useLoaderData()
    const [addresses, setAddresses] = useState<SavedAddress[]>(loaderAddresses as SavedAddress[])
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [label, setLabel] = useState<'home' | 'office' | 'other'>('home')
    const [address, setAddress] = useState('')
    const [baranggay, setBaranggay] = useState('')
    const [city, setCity] = useState('')
    const [isDefault, setIsDefault] = useState(false)

    // GPS coordinate detection for address form
    const [detectedCoords, setDetectedCoords] = useState<[number, number] | null>(null)
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'success' | 'failed'>('idle')

    // Detect GPS when form is opened
    useEffect(() => {
        if (!showForm) {
            setGpsStatus('idle')
            setDetectedCoords(null)
            return
        }

        if (!('geolocation' in navigator)) {
            setGpsStatus('failed')
            return
        }

        setGpsStatus('detecting')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setDetectedCoords([pos.coords.longitude, pos.coords.latitude])
                setGpsStatus('success')
            },
            () => {
                setGpsStatus('failed')
            },
        )
    }, [showForm])

    const handleSave = async () => {
        setSaving(true)
        try {
            // Use detected GPS coords, or fall back to Cabanatuan City default
            const coordinates: [number, number] = detectedCoords ?? [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat]

            const success = await saveAddress({
                data: {
                    label,
                    coordinates,
                    address,
                    baranggay: baranggay || undefined,
                    city: city || undefined,
                    isDefault,
                }
            })

            if (success) {
                const updated = await getSavedAddresses()
                setAddresses(updated as SavedAddress[])
                setShowForm(false)
                resetForm()
            }
        } catch {
            console.error('Failed to save address')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (addressLabel: string) => {
        try {
            await deleteAddress({ data: { label: addressLabel } })
            setAddresses(prev => prev.filter(a => a.label !== addressLabel))
        } catch {
            console.error('Failed to delete address')
        }
    }

    const resetForm = () => {
        setLabel('home')
        setAddress('')
        setBaranggay('')
        setCity('')
        setIsDefault(false)
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link to="/">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold text-white">My Addresses</h1>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-700"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <Plus size={14} className="mr-1" />
                        Add
                    </Button>
                </div>

                {/* Add Address Form */}
                {showForm && (
                    <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-4 mb-6 space-y-4">
                        <h3 className="text-white font-semibold">Add Address</h3>

                        {/* GPS location status */}
                        <div className="flex items-center gap-2 text-xs">
                            {gpsStatus === 'detecting' && (
                                <>
                                    <Loader2 size={12} className="animate-spin text-orange-400" />
                                    <span className="text-slate-400">Detecting your location...</span>
                                </>
                            )}
                            {gpsStatus === 'success' && (
                                <>
                                    <Crosshair size={12} className="text-green-400" />
                                    <span className="text-green-400">Location detected</span>
                                </>
                            )}
                            {gpsStatus === 'failed' && (
                                <>
                                    <MapPin size={12} className="text-yellow-400" />
                                    <span className="text-yellow-400">GPS unavailable — using default location</span>
                                </>
                            )}
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Type</label>
                            <Select value={label} onValueChange={(v) => setLabel(v as 'home' | 'office' | 'other')}>
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="home">🏠 Home</SelectItem>
                                    <SelectItem value="office">🏢 Office</SelectItem>
                                    <SelectItem value="other">📍 Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Address</label>
                            <Input
                                placeholder="Street address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Barangay</label>
                                <Input
                                    placeholder="Barangay"
                                    value={baranggay}
                                    onChange={(e) => setBaranggay(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">City</label>
                                <Input
                                    placeholder="City"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="rounded border-slate-700"
                            />
                            <span className="text-sm text-slate-300">Set as default address</span>
                        </label>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700"
                                onClick={() => { setShowForm(false); resetForm() }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-orange-500 hover:bg-orange-600"
                                disabled={!address || saving}
                                onClick={handleSave}
                            >
                                {saving ? 'Saving...' : 'Save Address'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Address List */}
                {addresses.length === 0 && !showForm ? (
                    <div className="text-center py-12">
                        <MapPin size={48} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 mb-2">No saved addresses</p>
                        <p className="text-xs text-slate-500 mb-4">
                            Add your Home and Office locations for quick ordering
                        </p>
                        <Button
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={() => setShowForm(true)}
                        >
                            <Plus size={14} className="mr-2" />
                            Add Your First Address
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addresses.map((addr) => {
                            const Icon = LABEL_ICONS[addr.label] || MapPin
                            const color = LABEL_COLORS[addr.label] || 'text-slate-400'
                            return (
                                <div
                                    key={addr.label}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <Icon size={20} className={cn('mt-0.5', color)} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-white font-semibold capitalize">{addr.label}</h3>
                                                    {addr.isDefault && (
                                                        <span className="flex items-center gap-1 text-xs text-orange-400">
                                                            <Star size={10} /> Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 mt-1">{addr.address}</p>
                                                {(addr.baranggay || addr.city) && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {[addr.baranggay, addr.city].filter(Boolean).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-500 hover:text-red-400"
                                            onClick={() => handleDelete(addr.label)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
