import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

let client: MongoClient | null = null
let isConnected = false

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'

  await mongoose.connect(uri, {
    dbName: 'refillr',
  })

  isConnected = true

  return mongoose
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    isConnected = false
  }
}

export { mongoose }
