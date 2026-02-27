import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSavedAddresses, saveAddress, deleteAddress } from '@/server/user.functions'
import { UserModel } from '@/models/User.server'

vi.mock('@/models/User.server', () => ({
    UserModel: {
        findOne: vi.fn(),
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
        context: { userId: 'clerk_user_123', riderId: 'rider_123' }
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
    auth: vi.fn().mockResolvedValue({ userId: 'clerk_user_123' }),
}))

vi.mock('@tanstack/react-router', () => ({
    redirect: vi.fn(),
}))

describe('User Server Functions (Saved Addresses)', () => {
    const mockUserId = 'clerk_user_123'
    const mockAddress = {
        label: 'home',
        coordinates: [121.0, 14.5],
        address: '123 Main St',
        isDefault: true,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getSavedAddresses', () => {
        it('should return saved addresses for a user', async () => {
            vi.mocked(UserModel.findOne).mockReturnValue({
                lean: vi.fn().mockResolvedValue({
                    savedAddresses: [mockAddress],
                }),
            } as never)

            const result = await getSavedAddresses({ data: undefined } as any)

            expect(UserModel.findOne).toHaveBeenCalledWith({ clerkId: mockUserId })
            expect(result).toHaveLength(1)
            expect(result[0].label).toBe('home')
        })

        it('should return empty array if user not found', async () => {
            vi.mocked(UserModel.findOne).mockReturnValue({
                lean: vi.fn().mockResolvedValue(null),
            } as never)

            const result = await getSavedAddresses({ data: undefined } as any)
            expect(result).toEqual([])
        })
    })

    describe('saveAddress', () => {
        it('should update an existing address label', async () => {
            vi.mocked(UserModel.findOne).mockReturnValue({
                lean: vi.fn().mockResolvedValue({ savedAddresses: [mockAddress] }),
            } as never)
            vi.mocked(UserModel.updateOne)
                .mockResolvedValueOnce({} as any) // clear isDefault
                .mockResolvedValueOnce({} as any) // update existing address

            const result = await saveAddress({
                data: {
                    ...mockAddress,
                },
            } as any)

            expect(result).toBe(true)
            expect(UserModel.findOne).toHaveBeenCalledWith(
                { clerkId: mockUserId, 'savedAddresses.label': 'home' }
            )
            expect(UserModel.updateOne).toHaveBeenCalledWith(
                { clerkId: mockUserId, 'savedAddresses.label': 'home' },
                expect.objectContaining({ $set: expect.any(Object) })
            )
        })

        it('should add a new address if label not found', async () => {
            vi.mocked(UserModel.findOne).mockReturnValue({
                lean: vi.fn().mockResolvedValue(null),
            } as never)
            vi.mocked(UserModel.updateOne)
                .mockResolvedValueOnce({} as any) // clear isDefault
                .mockResolvedValueOnce({} as any) // push new

            const result = await saveAddress({
                data: {
                    ...mockAddress,
                },
            } as any)

            expect(result).toBe(true)
            expect(UserModel.updateOne).toHaveBeenCalledWith(
                { clerkId: mockUserId },
                expect.objectContaining({ $push: expect.any(Object) }),
                expect.any(Object)
            )
        })
    })

    describe('deleteAddress', () => {
        it('should remove an address by label', async () => {
            vi.mocked(UserModel.updateOne).mockResolvedValue({} as any)

            const result = await deleteAddress({
                data: {
                    label: 'home',
                },
            } as any)

            expect(result).toBe(true)
            expect(UserModel.updateOne).toHaveBeenCalledWith(
                { clerkId: mockUserId },
                expect.objectContaining({ $pull: expect.any(Object) })
            )
        })
    })
})
