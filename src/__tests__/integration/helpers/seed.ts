import { MerchantModel } from '@/models/Merchant.server'
import { UserModel } from '@/models/User.server'
import { RiderModel } from '@/models/Rider.server'
import { OrderModel } from '@/models/Order.server'
import { DOEConfigModel } from '@/models/DOEConfig.server'
import { Types } from 'mongoose'

// Default location: Cabanatuan City center
const DEFAULT_COORDS: [number, number] = [120.9734, 15.4868]

export async function createTestUser(overrides: Partial<{
  clerkId: string
  email: string
  firstName: string
  lastName: string
  role: 'customer' | 'merchant' | 'rider' | 'admin'
}> = {}) {
  return UserModel.create({
    clerkId: overrides.clerkId ?? `user_${new Types.ObjectId().toString()}`,
    email: overrides.email ?? `test-${Date.now()}@test.com`,
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
    role: overrides.role ?? 'customer',
  })
}

export async function createTestMerchant(overrides: Partial<{
  ownerUserId: string
  shopName: string
  doePermitNumber: string
  location: { type: 'Point'; coordinates: [number, number] }
  brandsAccepted: string[]
  pricing: Record<string, number>
  isOpen: boolean
  isVerified: boolean
  tankSizes: string[]
  deliveryRadiusMeters: number
  deliveryPolygon: any
}> = {}) {
  return MerchantModel.create({
    ownerUserId: overrides.ownerUserId ?? `user_${new Types.ObjectId().toString()}`,
    shopName: overrides.shopName ?? `Test Shop ${Date.now()}`,
    doePermitNumber: overrides.doePermitNumber ?? `DOE-${Date.now()}`,
    location: overrides.location ?? { type: 'Point', coordinates: DEFAULT_COORDS },
    brandsAccepted: overrides.brandsAccepted ?? ['Gasul', 'Solane'],
    pricing: overrides.pricing ?? { 'Gasul-11kg': 800, 'Solane-11kg': 850 },
    isOpen: overrides.isOpen ?? true,
    isVerified: overrides.isVerified ?? false,
    tankSizes: overrides.tankSizes ?? ['11kg'],
    deliveryRadiusMeters: overrides.deliveryRadiusMeters ?? 5000,
    ...(overrides.deliveryPolygon && { deliveryPolygon: overrides.deliveryPolygon }),
  })
}

export async function createTestRider(overrides: Partial<{
  userId: string
  firstName: string
  lastName: string
  phoneNumber: string
  vehicleType: 'motorcycle' | 'bicycle' | 'sidecar'
  isOnline: boolean
  lastLocation: { type: 'Point'; coordinates: [number, number] }
}> = {}) {
  return RiderModel.create({
    userId: overrides.userId ?? `user_${new Types.ObjectId().toString()}`,
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'Rider',
    phoneNumber: overrides.phoneNumber ?? '09171234567',
    vehicleType: overrides.vehicleType ?? 'motorcycle',
    isOnline: overrides.isOnline ?? true,
    ...(overrides.lastLocation && { lastLocation: overrides.lastLocation }),
  })
}

export async function createTestOrder(overrides: Partial<{
  userId: string
  merchantId: Types.ObjectId
  riderId: string
  tankBrand: string
  tankSize: string
  quantity: number
  totalPrice: number
  status: string
  deliveryLocation: { type: 'Point'; coordinates: [number, number] }
  deliveryAddress: string
}> = {}) {
  return OrderModel.create({
    userId: overrides.userId ?? 'user_123',
    merchantId: overrides.merchantId ?? new Types.ObjectId(),
    tankBrand: overrides.tankBrand ?? 'Gasul',
    tankSize: overrides.tankSize ?? '11kg',
    quantity: overrides.quantity ?? 1,
    totalPrice: overrides.totalPrice ?? 800,
    status: overrides.status ?? 'pending',
    deliveryLocation: overrides.deliveryLocation ?? { type: 'Point', coordinates: DEFAULT_COORDS },
    deliveryAddress: overrides.deliveryAddress ?? '123 Test Street, Cabanatuan City',
    ...(overrides.riderId && { riderId: overrides.riderId }),
  })
}

export async function createTestDOEConfig(overrides: Partial<{
  weekLabel: string
  effectiveDate: Date
  isActive: boolean
  prices: Array<{
    brand: string
    size: string
    suggestedRetailPrice: number
    maxRetailPrice: number
  }>
}> = {}) {
  return DOEConfigModel.create({
    weekLabel: overrides.weekLabel ?? '2026-W09',
    effectiveDate: overrides.effectiveDate ?? new Date('2026-02-23'),
    isActive: overrides.isActive ?? true,
    prices: overrides.prices ?? [
      { brand: 'Gasul', size: '11kg', suggestedRetailPrice: 770, maxRetailPrice: 850 },
      { brand: 'Solane', size: '11kg', suggestedRetailPrice: 790, maxRetailPrice: 870 },
    ],
  })
}
