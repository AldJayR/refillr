import { createMiddleware } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'

/**
 * Middleware to inject Clerk authentication context into server functions.
 */
export const authMiddleware = createMiddleware({ type: 'function' })
    .server(async ({ next }) => {
        const authData = await auth()

        return next({
            context: {
                auth: authData,
                userId: authData.userId,
            },
        })
    })

/**
 * Middleware that requires a user to be authenticated.
 */
export const requireAuthMiddleware = createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
        if (!context.userId) {
            throw redirect({
                to: '/', // Or /sign-in if available
            })
        }

        return next({
            context: {
                userId: context.userId,
            },
        })
    })

/**
 * Middleware that verifies the authenticated user owns the merchant
 * specified by `data.merchantId` in the server function input.
 */
export const requireMerchantOwnership = createMiddleware({ type: 'function' })
  .middleware([requireAuthMiddleware])
  .server(async ({ next, context, data }) => {
    const { connectToDatabase } = await import('@/lib/db.server')
    const { MerchantModel } = await import('@/models/Merchant.server')

    await connectToDatabase()

    const merchantId = (data as unknown as { merchantId?: string })?.merchantId
    if (!merchantId) {
      throw new Error('merchantId is required')
    }

    const merchant = await MerchantModel.exists({
      _id: merchantId,
      ownerUserId: context.userId,
    })

    if (!merchant) {
      throw new Error('You do not own this merchant')
    }

    return next({
      context: {
        userId: context.userId,
        merchantId,
      },
    })
  })
