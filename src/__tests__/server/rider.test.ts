import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPendingOrdersNearby, acceptOrder, markDispatched, markDelivered } from '@/server/rider.functions'
import { OrderModel } from '@/models/Order.server'
import { Types } from 'mongoose'

vi.mock('@/models/Order.server', () => ({
    OrderModel: {
        find: vi.fn(),
        findById: vi.fn(),
        updateOne: vi.fn(),
    },
}))

vi.mock('@/lib/db.server', () => ({
    connectToDatabase: vi.fn().mockResolvedValue(true),
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

describe('Rider Server Functions', () => {
    const mockOrderId = new Types.ObjectId().toString()
    const mockOrder = {
        _id: new Types.ObjectId(mockOrderId),
        userId: 'user123',
        merchantId: new Types.ObjectId(),
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
        set: vi.fn(),
        save: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getPendingOrdersNearby', () => {
        it('should fetch nearby pending orders', async () => {
            vi.mocked(OrderModel.find).mockReturnValue({
                sort: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                        lean: vi.fn().mockResolvedValue([mockOrder]),
                    }),
                }),
            } as never)

            const result = await getPendingOrdersNearby({
                data: {
                    latitude: 14.5,
                    longitude: 121.0,
                    radiusMeters: 5000,
                },
            } as any)

            expect(OrderModel.find).toHaveBeenCalledWith(expect.objectContaining({
                status: 'pending',
                'deliveryLocation.coordinates': expect.any(Object),
            }))
            expect(result).toHaveLength(1)
            expect(result[0]._id).toBe(mockOrderId)
        })
    })

    describe('acceptOrder', () => {
        it('should allow a rider to accept a pending order', async () => {
            vi.mocked(OrderModel.findById).mockResolvedValue(mockOrder as never)
            mockOrder.save.mockResolvedValue(mockOrder)

            const result = await acceptOrder({
                data: {
                    orderId: mockOrderId,
                },
            } as any)

            expect(result.success).toBe(true)
            expect(mockOrder.set).toHaveBeenCalledWith('status', 'accepted')
            expect(mockOrder.set).toHaveBeenCalledWith('riderId', 'user_123')
            expect(mockOrder.save).toHaveBeenCalled()
        })

        it('should fail if order is not pending', async () => {
            const acceptedOrder = { ...mockOrder, status: 'accepted' }
            vi.mocked(OrderModel.findById).mockResolvedValue(acceptedOrder as never)

            const result = await acceptOrder({
                data: {
                    orderId: mockOrderId,
                },
            } as any)

            expect(result.success).toBe(false)
            expect(result.error).toBe('Order is no longer available')
        })
    })

    describe('markDispatched', () => {
        it('should update status to dispatched', async () => {
            const acceptedOrder = { ...mockOrder, status: 'accepted', riderId: 'user_123', set: vi.fn(), save: vi.fn() }
            vi.mocked(OrderModel.findById).mockResolvedValue(acceptedOrder as never)

            const result = await markDispatched({ data: mockOrderId.toString() } as any)

            expect(result).toBe(true)
            expect(acceptedOrder.set).toHaveBeenCalledWith('status', 'dispatched')
            expect(acceptedOrder.save).toHaveBeenCalled()
        })
    })

    describe('markDelivered', () => {
        it('should update status to delivered', async () => {
            const dispatchedOrder = { ...mockOrder, status: 'dispatched', riderId: 'user_123', set: vi.fn(), save: vi.fn() }
            vi.mocked(OrderModel.findById).mockResolvedValue(dispatchedOrder as never)

            const result = await markDelivered({ data: mockOrderId.toString() } as any)

            expect(result).toBe(true)
            expect(dispatchedOrder.set).toHaveBeenCalledWith('status', 'delivered')
            expect(dispatchedOrder.save).toHaveBeenCalled()
        })
    })
})
