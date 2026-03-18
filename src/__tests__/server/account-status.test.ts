import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db.server', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/models/User.server', () => ({
  UserModel: {
    findOne: vi.fn(),
  },
}))

vi.mock('@/models/Merchant.server', () => ({
  MerchantModel: {
    findOne: vi.fn(),
  },
}))

vi.mock('@/models/Rider.server', () => ({
  RiderModel: {
    findOne: vi.fn(),
  },
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder: any = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (fn: any) => (args: any) => fn({
        ...args,
        context: { userId: 'user_123' },
      }),
    }
    return builder
  },
  createMiddleware: () => {
    const builder: any = {
      server: () => builder,
      middleware: () => builder,
    }
    return builder
  },
}))

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user_123' }),
}))

vi.mock('@/server/middleware', () => ({
  requireAuthMiddleware: {
    middleware: () => ({
      server: () => ({
        handler: (fn: any) => fn,
      }),
    }),
  },
}))

import { UserModel } from '@/models/User.server'
import { MerchantModel } from '@/models/Merchant.server'
import { RiderModel } from '@/models/Rider.server'
import { getMyAccountStatus } from '@/server/user.functions'

describe('getMyAccountStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns merchant account state', async () => {
    vi.mocked(UserModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ role: 'merchant' }) } as never)
    vi.mocked(MerchantModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'merchant-1' }) } as never)
    vi.mocked(RiderModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never)

    const result = await getMyAccountStatus({} as any)

    expect(result).toEqual({ role: 'merchant', hasMerchant: true, hasRider: false })
  })

  it('returns customer account state', async () => {
    vi.mocked(UserModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ role: 'customer' }) } as never)
    vi.mocked(MerchantModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never)
    vi.mocked(RiderModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never)

    const result = await getMyAccountStatus({} as any)

    expect(result).toEqual({ role: 'customer', hasMerchant: false, hasRider: false })
  })
})
