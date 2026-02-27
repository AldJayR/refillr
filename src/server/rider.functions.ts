import { createServerFn } from '@tanstack/react-start'
import { GetPendingOrdersSchema, AcceptOrderSchema, CreateRiderSchema, objectIdRegex } from '@/lib/schemas'
import { requireAuthMiddleware } from './middleware'
import { z } from 'zod'
import {
    handleGetMyRider,
    handleCreateRider,
    handleUpdateRiderStatus,
    handleUpdateRiderLocation,
    handleGetNearbyRiders,
    handleGetPendingOrdersNearby,
    handleAcceptOrder,
    handleMarkDispatched,
    handleMarkDelivered,
} from './rider.handlers'

/**
 * Get the current user's rider profile.
 * Returns null if the user hasn't registered as a rider yet.
 */
export const getMyRider = createServerFn({ method: 'GET' })
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleGetMyRider(args))

/**
 * Register a new rider profile and update user role to 'rider'.
 * Uses a MongoDB transaction to ensure both the rider creation and
 * user role update succeed or fail together (cross-collection atomicity).
 */
export const createRider = createServerFn({ method: 'POST' })
    .inputValidator(CreateRiderSchema)
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleCreateRider(args))

/**
 * Update a rider's online status.
 */
export const updateRiderStatus = createServerFn({ method: 'POST' })
    .inputValidator(z.object({ isOnline: z.boolean() }))
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleUpdateRiderStatus(args))

/**
 * Update a rider's current location.
 */
export const updateRiderLocation = createServerFn({ method: 'POST' })
    .inputValidator(z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
    }))
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleUpdateRiderLocation(args))

/**
 * Get online riders near a location.
 * Public endpoint — no auth required; rider locations are public map data.
 */
export const getNearbyRiders = createServerFn({ method: 'GET' })
    .inputValidator(z.object({ 
        latitude: z.number().min(-90).max(90), 
        longitude: z.number().min(-180).max(180),
        radiusMeters: z.number().int().positive().max(50000).default(5000)
    }))
    .handler(async (args) => handleGetNearbyRiders(args))

/**
 * Get pending orders near a rider's location.
 */
export const getPendingOrdersNearby = createServerFn({ method: 'GET' })
    .inputValidator(GetPendingOrdersSchema)
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleGetPendingOrdersNearby(args))

/**
 * Accept an order as a rider.
 * Uses atomic findOneAndUpdate to prevent race conditions (double-accept).
 */
export const acceptOrder = createServerFn({ method: 'POST' })
    .inputValidator(AcceptOrderSchema)
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleAcceptOrder(args))

/**
 * Mark an order as dispatched.
 * Uses atomic findOneAndUpdate with status + riderId preconditions.
 */
export const markDispatched = createServerFn({ method: 'POST' })
    .inputValidator(z.string().regex(objectIdRegex, 'Invalid order ID format'))
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleMarkDispatched(args))

/**
 * Mark an order as delivered.
 * Uses atomic findOneAndUpdate with status + riderId preconditions.
 */
export const markDelivered = createServerFn({ method: 'POST' })
    .inputValidator(z.string().regex(objectIdRegex, 'Invalid order ID format'))
    .middleware([requireAuthMiddleware])
    .handler(async (args) => handleMarkDelivered(args))
