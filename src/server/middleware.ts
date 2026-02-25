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
