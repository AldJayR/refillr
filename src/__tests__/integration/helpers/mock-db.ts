/**
 * Shared vi.mock factory for @/lib/db.server in integration tests.
 *
 * - `connectToDatabase` becomes a no-op (connectTestDb already connected mongoose)
 * - `withTransaction` and `mongoose` are re-exported from the real module
 */
import mongoose from 'mongoose'

export function createDbServerMock() {
  return {
    connectToDatabase: async () => mongoose,
    // withTransaction uses mongoose.startSession() directly — works fine
    // since connectTestDb already established the connection
    withTransaction: async <T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> => {
      const session = await mongoose.startSession()
      try {
        let result: T
        await session.withTransaction(async () => {
          result = await fn(session)
        })
        return result!
      } finally {
        session.endSession()
      }
    },
    mongoose,
  }
}
