import mongoose from 'mongoose'
import { env } from '@/lib/env.server'

let isConnected = false

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose
  }

  await mongoose.connect(env.MONGODB_URI, {
    dbName: 'refillr',
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

export { mongoose }
