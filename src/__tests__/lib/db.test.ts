import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env
vi.mock('@/lib/env.server', () => ({
  env: { MONGODB_URI: 'mongodb://localhost:27017/test' },
}))

// Mock session (defined outside vi.mock so we can reference it in tests)
const mockSession = {
  withTransaction: vi.fn().mockImplementation(async (fn) => {
    await fn()
  }),
  endSession: vi.fn(),
}

// Mock mongoose
const mockConnection = { readyState: 0 }

vi.mock('mongoose', () => {
  return {
    default: {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      startSession: vi.fn().mockResolvedValue(mockSession),
      connection: mockConnection,
    },
  }
})

describe('db.server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('connectToDatabase', () => {
    it('should connect to MongoDB and return mongoose', async () => {
      const mongoose = (await import('mongoose')).default
      const { connectToDatabase } = await import('@/lib/db.server')

      mockConnection.readyState = 0

      const result = await connectToDatabase()

      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        {
          dbName: 'refillr',
          retryWrites: true,
          retryReads: true,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        }
      )
      expect(result).toBe(mongoose)
    })

    it('should return cached connection when already connected', async () => {
      const mongoose = (await import('mongoose')).default
      const { connectToDatabase } = await import('@/lib/db.server')

      // First call: readyState=0, so it connects
      mockConnection.readyState = 0
      await connectToDatabase()
      expect(mongoose.connect).toHaveBeenCalledTimes(1)

      // Simulate that connection is now established
      mockConnection.readyState = 1

      // Second call: isConnected=true AND readyState=1, should short-circuit
      const result = await connectToDatabase()
      expect(mongoose.connect).toHaveBeenCalledTimes(1) // Still 1, not called again
      expect(result).toBe(mongoose)
    })
  })

  describe('closeDatabase', () => {
    it('should disconnect when connection is active', async () => {
      const mongoose = (await import('mongoose')).default
      const { closeDatabase } = await import('@/lib/db.server')

      mockConnection.readyState = 1

      await closeDatabase()

      expect(mongoose.disconnect).toHaveBeenCalledTimes(1)
    })

    it('should not disconnect when already disconnected', async () => {
      const mongoose = (await import('mongoose')).default
      const { closeDatabase } = await import('@/lib/db.server')

      mockConnection.readyState = 0

      await closeDatabase()

      expect(mongoose.disconnect).not.toHaveBeenCalled()
    })
  })

  describe('withTransaction', () => {
    it('should execute callback with session and return result', async () => {
      const mongoose = (await import('mongoose')).default
      const { withTransaction } = await import('@/lib/db.server')

      const callback = vi.fn().mockResolvedValue('test-result')
      const result = await withTransaction(callback)

      expect(mongoose.startSession).toHaveBeenCalledTimes(1)
      expect(mockSession.withTransaction).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(mockSession)
      expect(result).toBe('test-result')
      expect(mockSession.endSession).toHaveBeenCalledTimes(1)
    })

    it('should end session even if callback throws', async () => {
      const { withTransaction } = await import('@/lib/db.server')

      const error = new Error('transaction failed')
      const callback = vi.fn().mockRejectedValue(error)

      await expect(withTransaction(callback)).rejects.toThrow('transaction failed')
      expect(mockSession.endSession).toHaveBeenCalledTimes(1)
    })

    it('should pass session to callback', async () => {
      const { withTransaction } = await import('@/lib/db.server')

      let receivedSession: unknown = null
      await withTransaction(async (session) => {
        receivedSession = session
        return 'done'
      })

      expect(receivedSession).toBe(mockSession)
    })
  })
})
