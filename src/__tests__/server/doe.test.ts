import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'

const mockEnv = vi.hoisted(() => ({ NODE_ENV: 'development' }))

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
  withTransaction: vi.fn().mockImplementation((fn) => fn({})),
}))

vi.mock('@/models/DOEConfig.server', () => ({
  DOEConfigModel: {
    findOne: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/lib/env.server', () => ({
  env: mockEnv,
}))

import { getDOEPrices, seedDOEPrices } from '@/server/doe.functions'
import { DOEConfigModel } from '@/models/DOEConfig.server'
import { withTransaction } from '@/lib/db.server'

const mockConfigId = new Types.ObjectId()
const mockConfig = {
  _id: mockConfigId,
  weekLabel: '2026-W09',
  effectiveDate: new Date('2026-02-23'),
  isActive: true,
  prices: [
    { brand: 'Gasul', size: '11kg', suggestedRetailPrice: 770, maxRetailPrice: 850 },
  ],
}

describe('DOE Server Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.NODE_ENV = 'development'
  })

  describe('getDOEPrices', () => {
    it('should return active DOE config when found', async () => {
      vi.mocked(DOEConfigModel.findOne).mockReturnValue({
        sort: () => ({ lean: () => Promise.resolve(mockConfig) }),
      } as never)

      const result = await getDOEPrices({} as any)

      expect(result).not.toBeNull()
      expect(result!._id).toBe(mockConfigId.toString())
      expect(result!.weekLabel).toBe('2026-W09')
      expect(result!.isActive).toBe(true)
    })

    it('should return null when no active config', async () => {
      vi.mocked(DOEConfigModel.findOne).mockReturnValue({
        sort: () => ({ lean: () => Promise.resolve(null) }),
      } as never)

      const result = await getDOEPrices({} as any)

      expect(result).toBeNull()
    })
  })

  describe('seedDOEPrices', () => {
    it('should deactivate old configs and create new one', async () => {
      vi.mocked(DOEConfigModel.updateMany).mockResolvedValue({} as never)
      vi.mocked(DOEConfigModel.create).mockResolvedValue([mockConfig] as never)

      const result = await seedDOEPrices({} as any)

      expect(result).toBe(mockConfigId.toString())
      expect(DOEConfigModel.updateMany).toHaveBeenCalledWith(
        {},
        { $set: { isActive: false } },
        { session: {} },
      )
      expect(DOEConfigModel.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            weekLabel: '2026-W09',
            isActive: true,
          }),
        ]),
        { session: {} },
      )
    })

    it('should throw in non-development environment', async () => {
      mockEnv.NODE_ENV = 'production'

      await expect(seedDOEPrices({} as any)).rejects.toThrow(
        'seedDOEPrices is only available in development',
      )
    })

    it('should use withTransaction for atomicity', async () => {
      vi.mocked(DOEConfigModel.updateMany).mockResolvedValue({} as never)
      vi.mocked(DOEConfigModel.create).mockResolvedValue([mockConfig] as never)

      await seedDOEPrices({} as any)

      expect(withTransaction).toHaveBeenCalledWith(expect.any(Function))
    })
  })
})
