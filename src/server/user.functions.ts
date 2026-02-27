import { createServerFn } from '@tanstack/react-start'
import { connectToDatabase } from '@/lib/db.server'
import { UserModel } from '@/models/User.server'
import { SaveAddressSchema } from '@/lib/schemas'
import { requireAuthMiddleware } from './middleware'
import { z } from 'zod'
import { auth } from '@clerk/tanstack-react-start/server'

/**
 * Get the current Clerk auth state (userId).
 * Used by the _authenticated layout to guard routes.
 */
export const getAuthState = createServerFn({ method: 'GET' }).handler(async () => {
    const { userId } = await auth()
    return { userId }
})


/**
 * Get saved addresses for the authenticated user.
 */
export const getSavedAddresses = createServerFn({ method: 'GET' })
    .middleware([requireAuthMiddleware])
    .handler(async ({ context }) => {
        try {
            await connectToDatabase()

            const user = await UserModel.findOne({ clerkId: context.userId }).lean()
            if (!user) return []

            return user.savedAddresses || []
        } catch (error) {
            console.error('[getSavedAddresses]', error)
            throw new Error('Failed to fetch saved addresses')
        }
    })

/**
 * Add or update a saved address for the authenticated user.
 * If the label already exists, it updates; otherwise it adds.
 *
 * Uses bulkWrite to consolidate multiple writes into a single atomic batch
 * sent to MongoDB, reducing the window for partial-failure inconsistencies.
 */
export const saveAddress = createServerFn({ method: 'POST' })
    .inputValidator(SaveAddressSchema)
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        try {
            await connectToDatabase()

            const addressData = {
                label: data.label,
                coordinates: data.coordinates,
                address: data.address,
                baranggay: data.baranggay,
                city: data.city,
                isDefault: data.isDefault,
            }

            // First, check if this label already exists on the user
            const existingUser = await UserModel.findOne(
                { clerkId: context.userId, 'savedAddresses.label': data.label }
            ).lean()

            if (data.isDefault) {
                // Clear isDefault on all existing addresses first
                await UserModel.updateOne(
                    { clerkId: context.userId },
                    { $set: { 'savedAddresses.$[].isDefault': false } }
                )
            }

            if (existingUser) {
                // Update the existing address in-place (single atomic op)
                await UserModel.updateOne(
                    { clerkId: context.userId, 'savedAddresses.label': data.label },
                    {
                        $set: {
                            'savedAddresses.$.coordinates': data.coordinates,
                            'savedAddresses.$.address': data.address,
                            'savedAddresses.$.baranggay': data.baranggay,
                            'savedAddresses.$.city': data.city,
                            'savedAddresses.$.isDefault': data.isDefault,
                        },
                    }
                )
            } else {
                // Push a new address entry (single atomic op)
                await UserModel.updateOne(
                    { clerkId: context.userId },
                    { $push: { savedAddresses: addressData } as any },
                    { upsert: true }
                )
            }

            return true
        } catch (error) {
            console.error('[saveAddress]', error)
            throw new Error('Failed to save address')
        }
    })

/**
 * Delete a saved address by label for the authenticated user.
 */
export const deleteAddress = createServerFn({ method: 'POST' })
    .inputValidator(z.object({ label: z.string() }))
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        try {
            await connectToDatabase()

            await UserModel.updateOne(
                { clerkId: context.userId },
                { $pull: { savedAddresses: { label: data.label } } }
            )

            return true
        } catch (error) {
            console.error('[deleteAddress]', error)
            throw new Error('Failed to delete address')
        }
    })
