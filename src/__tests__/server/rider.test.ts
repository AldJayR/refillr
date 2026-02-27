import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'

vi.mock('@/models/Order.server', () => ({
    OrderModel: {
        find: vi.fn(),
        findOneAndUpdate: vi.fn(),
        exists: vi.fn(),
    },
}))

vi.mock('@/models/Rider.server', () => ({
    RiderModel: {
        findOne: vi.fn(),
        find: vi.fn(),
        exists: vi.fn(),
        findOneAndUpdate: vi.fn(),
        create: vi.fn(),
    },
}))

vi.mock('@/models/User.server', () => ({
    UserModel: {
        findOneAndUpdate: vi.fn(),
    },
}))

vi.mock('@/lib/db.server', () => ({
    connectToDatabase: vi.fn().mockResolvedValue(true),
    withTransaction: vi.fn().mockImplementation((fn) => fn({})),
}))

// Mock createServerFn and createMiddleware to bypass TanStack middleware and provide context
vi.mock('@tanstack/react-start', () => {
    const handler = (fn: any) => (args: any) => fn({
        ...args,
        context: { userId: 'user_123', riderId: 'rider_123' }
    })
    const builder = {
        middleware: () => builder,
        validator: () => builder,
        inputValidator: () => builder,
        handler,
    }
    const middlewareBuilder = {
        server: () => middlewareBuilder,
        middleware: () => middlewareBuilder,
    }
    return {
        createServerFn: () => builder,
        createMiddleware: () => middlewareBuilder,
    }
})

vi.mock('@clerk/tanstack-react-start/server', () => ({
    auth: vi.fn().mockResolvedValue({ userId: 'user_123' }),
}))

vi.mock('@tanstack/react-router', () => ({
    redirect: vi.fn(),
}))

import { OrderModel } from '@/models/Order.server'
import { RiderModel } from '@/models/Rider.server'
import { UserModel } from '@/models/User.server'
import {
    getMyRider,
    createRider,
    updateRiderStatus,
    updateRiderLocation,
    getNearbyRiders,
    getPendingOrdersNearby,
    acceptOrder,
    markDispatched,
    markDelivered,
} from '@/server/rider.functions'

describe('Rider Server Functions', () => {
    const mockOrderId = new Types.ObjectId()
    const mockRiderId = new Types.ObjectId()
    const mockMerchantId = new Types.ObjectId()

    const mockRider = {
        _id: mockRiderId,
        userId: 'user_123',
        firstName: 'Test',
        lastName: 'Rider',
        phoneNumber: '+639123456789',
        vehicleType: 'motorcycle',
        plateNumber: 'ABC-1234',
        isOnline: true,
        lastLocation: {
            type: 'Point',
            coordinates: [121.0, 14.5],
        },
    }

    const mockOrder = {
        _id: mockOrderId,
        userId: 'user456',
        merchantId: mockMerchantId,
        status: 'pending',
        deliveryLocation: {
            type: 'Point',
            coordinates: [121, 14],
        },
        deliveryAddress: 'Test Address',
        tankBrand: 'Gasul',
        tankSize: '11kg',
        quantity: 1,
        totalPrice: 1200,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getMyRider', () => {
        it('should return rider profile when found', async () => {
            vi.mocked(RiderModel.findOne).mockReturnValue({
                lean: () => Promise.resolve(mockRider),
            } as any)

            const result = await getMyRider({} as any)

            expect(RiderModel.findOne).toHaveBeenCalledWith({ userId: 'user_123' })
            expect(result).not.toBeNull()
            expect(result!._id).toBe(mockRiderId.toString())
        })

        it('should return null when not a rider', async () => {
            vi.mocked(RiderModel.findOne).mockReturnValue({
                lean: () => Promise.resolve(null),
            } as any)

            const result = await getMyRider({} as any)

            expect(result).toBeNull()
        })
    })

    describe('createRider', () => {
        const createRiderData = {
            firstName: 'Test',
            lastName: 'Rider',
            phoneNumber: '+639123456789',
            vehicleType: 'motorcycle' as const,
            plateNumber: 'ABC-1234',
        }

        it('should create rider and update user role in transaction', async () => {
            vi.mocked(RiderModel.findOne).mockResolvedValue(null as any)
            vi.mocked(RiderModel.create).mockResolvedValue([{ _id: mockRiderId }] as any)
            vi.mocked(UserModel.findOneAndUpdate).mockResolvedValue({} as any)

            const result = await createRider({ data: createRiderData } as any)

            expect(RiderModel.findOne).toHaveBeenCalledWith({ userId: 'user_123' })
            expect(RiderModel.create).toHaveBeenCalledWith(
                [expect.objectContaining({
                    ...createRiderData,
                    userId: 'user_123',
                })],
                { session: {} }
            )
            expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
                { clerkId: 'user_123' },
                { $set: { role: 'rider' } },
                { session: {} }
            )
            expect(result).toBe(mockRiderId.toString())
        })

        it('should return error if rider already exists', async () => {
            vi.mocked(RiderModel.findOne).mockResolvedValue({ _id: 'existing' } as any)

            const result = await createRider({ data: createRiderData } as any)

            expect(result).toEqual({ success: false, error: 'You already have a rider profile' })
            expect(RiderModel.create).not.toHaveBeenCalled()
        })
    })

    describe('updateRiderStatus', () => {
        it('should update online status when rider exists', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue({ _id: 'x' } as any)
            vi.mocked(RiderModel.findOneAndUpdate).mockResolvedValue({ isOnline: true } as any)

            const result = await updateRiderStatus({ data: { isOnline: true } } as any)

            expect(RiderModel.exists).toHaveBeenCalledWith({ userId: 'user_123' })
            expect(RiderModel.findOneAndUpdate).toHaveBeenCalledWith(
                { userId: 'user_123' },
                { $set: { isOnline: true } },
                { new: true }
            )
            expect(result).toBe(true)
        })

        it('should return false when not a rider', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue(null as any)

            const result = await updateRiderStatus({ data: { isOnline: true } } as any)

            expect(result).toBe(false)
            expect(RiderModel.findOneAndUpdate).not.toHaveBeenCalled()
        })
    })

    describe('updateRiderLocation', () => {
        it('should update location when rider exists', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue({ _id: 'x' } as any)
            vi.mocked(RiderModel.findOneAndUpdate).mockResolvedValue({
                lastLocation: { type: 'Point', coordinates: [121.0, 14.5] },
            } as any)

            const result = await updateRiderLocation({
                data: { latitude: 14.5, longitude: 121.0 },
            } as any)

            expect(RiderModel.exists).toHaveBeenCalledWith({ userId: 'user_123' })
            expect(RiderModel.findOneAndUpdate).toHaveBeenCalledWith(
                { userId: 'user_123' },
                {
                    $set: {
                        lastLocation: {
                            type: 'Point',
                            coordinates: [121.0, 14.5],
                        },
                    },
                },
                { new: true }
            )
            expect(result).toBe(true)
        })

        it('should return false when not a rider', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue(null as any)

            const result = await updateRiderLocation({
                data: { latitude: 14.5, longitude: 121.0 },
            } as any)

            expect(result).toBe(false)
            expect(RiderModel.findOneAndUpdate).not.toHaveBeenCalled()
        })
    })

    describe('getNearbyRiders', () => {
        it('should return nearby online riders', async () => {
            vi.mocked(RiderModel.find).mockReturnValue({
                select: () => ({
                    lean: () => Promise.resolve([mockRider]),
                }),
            } as any)

            const result = await getNearbyRiders({
                data: { latitude: 14.5, longitude: 121.0, radiusMeters: 5000 },
            } as any)

            expect(RiderModel.find).toHaveBeenCalledWith(expect.objectContaining({
                isOnline: true,
                lastLocation: expect.any(Object),
            }))
            expect(result).toHaveLength(1)
            expect(result[0]._id).toBe(mockRiderId.toString())
        })

        it('should return empty when none found', async () => {
            vi.mocked(RiderModel.find).mockReturnValue({
                select: () => ({
                    lean: () => Promise.resolve([]),
                }),
            } as any)

            const result = await getNearbyRiders({
                data: { latitude: 14.5, longitude: 121.0, radiusMeters: 5000 },
            } as any)

            expect(result).toEqual([])
        })
    })

    describe('getPendingOrdersNearby', () => {
        it('should fetch nearby pending orders', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue({ _id: 'x' } as any)
            vi.mocked(OrderModel.find).mockReturnValue({
                sort: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                        lean: vi.fn().mockResolvedValue([mockOrder]),
                    }),
                }),
            } as any)

            const result = await getPendingOrdersNearby({
                data: {
                    latitude: 14.5,
                    longitude: 121.0,
                    radiusMeters: 5000,
                },
            } as any)

            expect(RiderModel.exists).toHaveBeenCalledWith({ userId: 'user_123' })
            expect(OrderModel.find).toHaveBeenCalledWith(expect.objectContaining({
                status: 'pending',
                'deliveryLocation.coordinates': expect.any(Object),
            }))
            expect(result).toHaveLength(1)
            expect(result[0]._id).toBe(mockOrderId.toString())
            expect(result[0].merchantId).toBe(mockMerchantId.toString())
        })

        it('should return empty array if not a rider', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue(null as any)

            const result = await getPendingOrdersNearby({
                data: {
                    latitude: 14.5,
                    longitude: 121.0,
                    radiusMeters: 5000,
                },
            } as any)

            expect(result).toEqual([])
            expect(OrderModel.find).not.toHaveBeenCalled()
        })
    })

    describe('acceptOrder', () => {
        it('should allow a rider to accept a pending order', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue({ _id: 'x' } as any)
            vi.mocked(OrderModel.findOneAndUpdate).mockResolvedValue({
                _id: mockOrderId,
                status: 'accepted',
                riderId: 'user_123',
            } as any)

            const result = await acceptOrder({
                data: { orderId: mockOrderId.toString() },
            } as any)

            expect(RiderModel.exists).toHaveBeenCalledWith({ userId: 'user_123' })
            expect(OrderModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: mockOrderId.toString(), status: 'pending' },
                {
                    $set: expect.objectContaining({
                        status: 'accepted',
                        riderId: 'user_123',
                    }),
                },
                { new: true }
            )
            expect(result).toEqual({ success: true, orderId: mockOrderId.toString() })
        })

        it('should fail if order is no longer available', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue({ _id: 'x' } as any)
            vi.mocked(OrderModel.findOneAndUpdate).mockResolvedValue(null as any)
            vi.mocked(OrderModel.exists).mockResolvedValue({ _id: 'x' } as any)

            const result = await acceptOrder({
                data: { orderId: mockOrderId.toString() },
            } as any)

            expect(result).toEqual({ success: false, error: 'Order is no longer available' })
        })

        it('should fail if not a registered rider', async () => {
            vi.mocked(RiderModel.exists).mockResolvedValue(null as any)

            const result = await acceptOrder({
                data: { orderId: mockOrderId.toString() },
            } as any)

            expect(result).toEqual({ success: false, error: 'You must register as a rider first' })
            expect(OrderModel.findOneAndUpdate).not.toHaveBeenCalled()
        })
    })

    describe('markDispatched', () => {
        it('should update status to dispatched', async () => {
            vi.mocked(OrderModel.findOneAndUpdate).mockResolvedValue(mockOrder as any)

            const result = await markDispatched({ data: mockOrderId.toString() } as any)

            expect(OrderModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: mockOrderId.toString(), status: 'accepted', riderId: 'user_123' },
                {
                    $set: expect.objectContaining({
                        status: 'dispatched',
                    }),
                },
                { new: true }
            )
            expect(result).toBe(true)
        })

        it('should return false when preconditions not met', async () => {
            vi.mocked(OrderModel.findOneAndUpdate).mockResolvedValue(null as any)

            const result = await markDispatched({ data: mockOrderId.toString() } as any)

            expect(result).toBe(false)
        })
    })

    describe('markDelivered', () => {
        it('should update status to delivered', async () => {
            vi.mocked(OrderModel.findOneAndUpdate).mockResolvedValue(mockOrder as any)

            const result = await markDelivered({ data: mockOrderId.toString() } as any)

            expect(OrderModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: mockOrderId.toString(), status: 'dispatched', riderId: 'user_123' },
                {
                    $set: expect.objectContaining({
                        status: 'delivered',
                    }),
                },
                { new: true }
            )
            expect(result).toBe(true)
        })

        it('should return false when preconditions not met', async () => {
            vi.mocked(OrderModel.findOneAndUpdate).mockResolvedValue(null as any)

            const result = await markDelivered({ data: mockOrderId.toString() } as any)

            expect(result).toBe(false)
        })
    })
})
