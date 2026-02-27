import { createServerFn } from '@tanstack/react-start'
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  CancelOrderSchema
} from '@/lib/schemas'
import { z } from 'zod'
import { requireAuthMiddleware, requireMerchantOwnership } from './middleware'
import {
  handleCreateRefillRequest,
  handleGetUserOrders,
  handleGetMerchantOrders,
  handleCancelOrder,
  handleUpdateOrderStatus,
  handleGetOrderById,
} from './orders.handlers'

export const createRefillRequest = createServerFn({ method: 'POST' })
  .inputValidator(CreateOrderSchema)
  .middleware([requireAuthMiddleware])
  .handler(async (args) => handleCreateRefillRequest(args))

export const getUserOrders = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async (args) => handleGetUserOrders(args))

export const getMerchantOrders = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ merchantId: z.string() }))
  .middleware([requireMerchantOwnership])
  .handler(async (args) => handleGetMerchantOrders(args))

export const cancelOrder = createServerFn({ method: 'POST' })
  .inputValidator(CancelOrderSchema)
  .middleware([requireAuthMiddleware])
  .handler(async (args) => handleCancelOrder(args))

export const updateOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator(UpdateOrderStatusSchema)
  .middleware([requireAuthMiddleware])
  .handler(async (args) => handleUpdateOrderStatus(args))

export const getOrderById = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ orderId: z.string() }))
  .middleware([requireAuthMiddleware])
  .handler(async (args) => handleGetOrderById(args))
