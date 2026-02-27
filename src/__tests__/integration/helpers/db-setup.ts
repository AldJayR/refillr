import mongoose from 'mongoose'
import { MerchantModel } from '@/models/Merchant.server'
import { RiderModel } from '@/models/Rider.server'
import { OrderModel } from '@/models/Order.server'
import { UserModel } from '@/models/User.server'

const TEST_MONGODB_URI = 'mongodb://localhost:27017/refillr_test'

/**
 * Connect to the test database and ensure all schema indexes exist.
 * Call in beforeAll() of each integration test suite.
 */
export async function connectTestDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGODB_URI, {
      dbName: 'refillr_test',
      retryWrites: true,
      retryReads: true,
    })
  }

  // Ensure Typegoose 2dsphere and other schema indexes exist in the test DB.
  // Without this, $nearSphere / $geoWithin queries fail.
  await Promise.all([
    MerchantModel.syncIndexes(),
    RiderModel.syncIndexes(),
    OrderModel.syncIndexes(),
    UserModel.syncIndexes(),
  ])
}

/**
 * Drop all documents from all collections in the test database.
 * Call in beforeEach() for full isolation between tests.
 * Preserves indexes (they're on the collection schema, not the data).
 */
export async function cleanTestDb() {
  const collections = await mongoose.connection.db!.collections()
  for (const collection of collections) {
    await collection.deleteMany({})
  }
}

/**
 * Disconnect from the test database.
 * Call in afterAll() of each integration test suite.
 */
export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
}
