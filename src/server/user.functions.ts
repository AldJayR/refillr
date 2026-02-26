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
        await connectToDatabase()

        const user = await UserModel.findOne({ clerkId: context.userId }).lean()
        if (!user) return []

        return user.savedAddresses || []
    })

/**
 * Add or update a saved address for the authenticated user.
 * If the label already exists, it updates; otherwise it adds.
 */
export const saveAddress = createServerFn({ method: 'POST' })
    .inputValidator(SaveAddressSchema)
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        await connectToDatabase()

        // If the new address is set as default, remove default from existing
        if (data.isDefault) {
            await UserModel.updateOne(
                { clerkId: context.userId },
                { $set: { 'savedAddresses.$[].isDefault': false } }
            )
        }

        // Try to update existing address with same label
        const updateResult = await UserModel.updateOne(
            { clerkId: context.userId, 'savedAddresses.label': data.label },
            {
                $set: {
                    'savedAddresses.$.coordinates': data.coordinates,
                    'savedAddresses.$.address': data.address,
                    'savedAddresses.$.baranggay': data.baranggay,
                    'savedAddresses.$.city': data.city,
                    'savedAddresses.$.isDefault': data.isDefault,
                }
            }
        )

        // If no existing address with that label, push a new one
        if (updateResult.matchedCount === 0) {
            await UserModel.updateOne(
                { clerkId: context.userId },
                {
                    $push: {
                        savedAddresses: {
                            label: data.label,
                            coordinates: data.coordinates,
                            address: data.address,
                            baranggay: data.baranggay,
                            city: data.city,
                            isDefault: data.isDefault,
                        }
                    }
                },
                { upsert: true }
            )
        }

        return true
    })

/**
 * Delete a saved address by label for the authenticated user.
 */
export const deleteAddress = createServerFn({ method: 'POST' })
    .inputValidator(z.object({ label: z.string() }))
    .middleware([requireAuthMiddleware])
    .handler(async ({ data, context }) => {
        await connectToDatabase()

        await UserModel.updateOne(
            { clerkId: context.userId },
            { $pull: { savedAddresses: { label: data.label } } }
        )

        return true
    })
