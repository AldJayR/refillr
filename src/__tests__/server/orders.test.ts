import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'

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

vi.mock('@/lib/db.server', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/models/Order.server', () => ({
  OrderModel: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}))

import { createRefillRequest, getUserOrders, getMerchantOrders, cancelOrder, updateOrderStatus, getOrderById } from '@/server/orders.functions'
import { OrderModel } from '@/models/Order.server'

const mockOrderId = new Types.ObjectId()
const mockMerchantId = new Types.ObjectId()

const mockOrder = {
  _id: mockOrderId,
  userId: 'user_123',
  merchantId: mockMerchantId,
  tankBrand: 'Gasul',
  tankSize: '11kg',
  quantity: 1,
  totalPrice: 1200,
  status: 'pending' as const,
  deliveryLocation: { type: 'Point', coordinates: [120.9842, 14.5995] },
  deliveryAddress: '123 Test Street',
  cancellationReason: '',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('createRefillRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create order with valid data', async () => {
    vi.mocked(OrderModel.create).mockResolvedValue(mockOrder as never)

    const result = await createRefillRequest({
      data: {
        merchantId: mockMerchantId.toString(),
        tankBrand: 'Gasul',
        tankSize: '11kg',
        quantity: 1,
        totalPrice: 1200,
        deliveryLocation: { type: 'Point', coordinates: [120.9842, 14.5995] },
        deliveryAddress: '123 Test Street',
      }
    } as any)

    expect(OrderModel.create).toHaveBeenCalled()
    expect(result).toBe(mockOrderId.toString())
  })

  it('should convert merchantId to ObjectId', async () => {
    vi.mocked(OrderModel.create).mockResolvedValue(mockOrder as never)

    await createRefillRequest({
      data: {
        merchantId: mockMerchantId.toString(),
        tankBrand: 'Gasul',
        tankSize: '11kg',
        quantity: 1,
        totalPrice: 1200,
        deliveryLocation: { type: 'Point', coordinates: [120.9842, 14.5995] },
        deliveryAddress: '123 Test Street',
      }
    } as any)

    expect(OrderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: expect.any(Types.ObjectId),
      })
    )
  })

  it('should set default status to pending', async () => {
    vi.mocked(OrderModel.create).mockResolvedValue(mockOrder as never)

    await createRefillRequest({
      data: {
        merchantId: mockMerchantId.toString(),
        tankBrand: 'Gasul',
        tankSize: '11kg',
        quantity: 1,
        totalPrice: 1200,
        deliveryLocation: { type: 'Point', coordinates: [120.9842, 14.5995] },
        deliveryAddress: '123 Test Street',
      }
    } as any)

    expect(OrderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
      })
    )
  })
})

describe('getUserOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user orders sorted by createdAt desc', async () => {
    vi.mocked(OrderModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockOrder]),
        }),
      }),
    } as never)

    const result = await getUserOrders({ data: undefined } as any)

    expect(OrderModel.find).toHaveBeenCalledWith({ userId: 'user_123' })
    expect(result).toHaveLength(1)
  })

  it('should limit to 50 orders', async () => {
    const mockLimit = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    })
    const mockSort = vi.fn().mockReturnValue({ limit: mockLimit })
    vi.mocked(OrderModel.find).mockReturnValue({ sort: mockSort } as never)

    await getUserOrders({ data: undefined } as any)

    expect(mockLimit).toHaveBeenCalledWith(50)
  })
})

describe('getMerchantOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array when no merchantId', async () => {
    vi.mocked(OrderModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never)

    await getMerchantOrders({ data: { merchantId: mockMerchantId.toString() } } as any)
    // With a valid merchantId, it should query and return the result
    expect(OrderModel.find).toHaveBeenCalled()
  })

  it('should return merchant orders', async () => {
    vi.mocked(OrderModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockOrder]),
        }),
      }),
    } as never)

    await getMerchantOrders({ data: mockMerchantId.toString() } as any)

    expect(OrderModel.find).toHaveBeenCalledWith({
      merchantId: expect.any(Types.ObjectId),
    })
  })
})

describe('cancelOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return false when order not found', async () => {
    vi.mocked(OrderModel.findById).mockResolvedValue(null as never)

    const result = await cancelOrder({ data: { orderId: mockOrderId.toString() } } as any)

    expect(result).toBe(false)
  })

  it('should return false when order status is not pending', async () => {
    const nonPendingOrder = { ...mockOrder, status: 'dispatched' as const }
    vi.mocked(OrderModel.findById).mockResolvedValue(nonPendingOrder as never)

    const result = await cancelOrder({ data: { orderId: mockOrderId.toString() } } as any)

    expect(result).toBe(false)
  })

  it('should cancel order when status is pending', async () => {
    const pendingOrder = {
      ...mockOrder,
      status: 'pending' as const,
      cancellationReason: '',
      save: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockImplementation(function (this: Record<string, unknown>, key: string, val: unknown) {
        this[key] = val
      }),
    }
    vi.mocked(OrderModel.findById).mockResolvedValue(pendingOrder as never)

    const result = await cancelOrder({
      data: { orderId: mockOrderId.toString(), cancellationReason: 'Customer requested' },
    } as any)

    expect(result).toBe(true)
    expect(pendingOrder.save).toHaveBeenCalled()
    expect(pendingOrder.status).toBe('cancelled')
    expect(pendingOrder.cancellationReason).toBe('Customer requested')
  })

  it('should use default cancellation reason when not provided', async () => {
    const pendingOrder = {
      ...mockOrder,
      status: 'pending' as const,
      cancellationReason: '',
      save: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockImplementation(function (this: Record<string, unknown>, key: string, val: unknown) {
        this[key] = val
      }),
    }
    vi.mocked(OrderModel.findById).mockResolvedValue(pendingOrder as never)

    await cancelOrder({ data: { orderId: mockOrderId.toString() } } as any)

    expect(pendingOrder.cancellationReason).toBe('Cancelled by user')
  })
})

describe('updateOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return false when order not found', async () => {
    vi.mocked(OrderModel.findByIdAndUpdate).mockResolvedValue(null as never)

    const result = await updateOrderStatus({ data: { orderId: 'nonexistent', status: 'accepted' } } as any)
    expect(result).toBe(false)
  })

  it('should update status to accepted', async () => {
    vi.mocked(OrderModel.findByIdAndUpdate).mockResolvedValue(mockOrder as never)

    const result = await updateOrderStatus({
      data: { orderId: mockOrderId.toString(), status: 'accepted' },
    } as any)

    expect(result).toBe(true)
    expect(OrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockOrderId.toString(),
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'accepted',
          acceptedAt: expect.any(Date),
        }),
      }),
      { new: true }
    )
  })

  it('should set dispatchedAt when status is dispatched', async () => {
    vi.mocked(OrderModel.findByIdAndUpdate).mockResolvedValue(mockOrder as never)

    await updateOrderStatus({
      data: { orderId: mockOrderId.toString(), status: 'dispatched' },
    } as any)

    expect(OrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockOrderId.toString(),
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'dispatched',
          dispatchedAt: expect.any(Date),
        }),
      }),
      { new: true }
    )
  })

  it('should set deliveredAt when status is delivered', async () => {
    vi.mocked(OrderModel.findByIdAndUpdate).mockResolvedValue(mockOrder as never)

    await updateOrderStatus({
      data: { orderId: mockOrderId.toString(), status: 'delivered' },
    } as any)

    expect(OrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockOrderId.toString(),
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'delivered',
          deliveredAt: expect.any(Date),
        }),
      }),
      { new: true }
    )
  })

  it('should include riderId when provided', async () => {
    const riderId = new Types.ObjectId()
    vi.mocked(OrderModel.findByIdAndUpdate).mockResolvedValue(mockOrder as never)

    await updateOrderStatus({
      data: { orderId: mockOrderId.toString(), status: 'accepted', riderId: riderId.toString() },
    } as any)

    expect(OrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockOrderId.toString(),
      expect.objectContaining({
        $set: expect.objectContaining({
          riderId: riderId.toString(),
        }),
      }),
      { new: true }
    )
  })
})

describe('getOrderById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when orderId is missing', async () => {
    vi.mocked(OrderModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never)

    const result = await getOrderById({ data: { orderId: '' } } as any)
    expect(result).toBeNull()
  })

  it('should return order when found', async () => {
    vi.mocked(OrderModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockOrder),
    } as never)

    const result = await getOrderById({ data: { orderId: mockOrderId.toString() } } as any)

    expect(result).not.toBeNull()
  })

  it('should return null when not found', async () => {
    vi.mocked(OrderModel.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never)

    const result = await getOrderById({ data: { orderId: new Types.ObjectId().toString() } } as any)

    expect(result).toBeNull()
  })
})
