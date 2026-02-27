import mongoose from 'mongoose'
import { env } from '@/lib/env.server'

let isConnected = false

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose
  }

  await mongoose.connect(env.MONGODB_URI, {
    dbName: 'refillr',
    retryWrites: true,
    retryReads: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })

  isConnected = true

  return mongoose
}

export async function closeDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    isConnected = false
  }
}

/**
 * Execute a callback within a MongoDB transaction.
 * Requires a replica set (local single-node or Atlas).
 *
 * If any operation within the callback throws, the entire transaction
 * is aborted and no writes persist. The session is always cleaned up.
 *
 * Usage:
 *   await withTransaction(async (session) => {
 *     await ModelA.create([{ ... }], { session })
 *     await ModelB.findOneAndUpdate({ ... }, { ... }, { session })
 *   })
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
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
}

export { mongoose }
