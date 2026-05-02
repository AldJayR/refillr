import 'reflect-metadata'
import { connectToDatabase, closeDatabase } from './src/lib/db.server.js'
import { 
  createTestUser, 
  createTestMerchant, 
  createTestRider, 
  createTestOrder, 
  createTestDOEConfig 
} from './src/__tests__/integration/helpers/seed.js'
import { UserModel } from './src/models/User.server.js'
import { MerchantModel } from './src/models/Merchant.server.js'
import { RiderModel } from './src/models/Rider.server.js'
import { OrderModel } from './src/models/Order.server.js'
import { DOEConfigModel } from './src/models/DOEConfig.server.js'

async function seed() {
  console.log('🚀 Starting database seed...')
  
  try {
    await connectToDatabase()
    
    // 1. Clear existing data
    console.log('🧹 Clearing existing collections...')
    await Promise.all([
      UserModel.deleteMany({}),
      MerchantModel.deleteMany({}),
      RiderModel.deleteMany({}),
      OrderModel.deleteMany({}),
      DOEConfigModel.deleteMany({}),
    ])

    // 2. Create DOE Configuration
    console.log('📊 Seeding DOE pricing guidelines...')
    await createTestDOEConfig({
      weekLabel: '2026-W18',
      effectiveDate: new Date('2026-04-27'),
    })

    // 3. Create 10 Users (to satisfy 10 documents per collection)
    console.log('👤 Seeding 10 users...')
    const users = []
    const roles: Array<'customer' | 'merchant' | 'rider'> = ['merchant', 'rider', 'customer', 'customer', 'customer', 'customer', 'customer', 'customer', 'customer', 'customer']
    
    for (let i = 0; i < 10; i++) {
      const user = await createTestUser({
        clerkId: `user_${i + 1}`,
        email: `${roles[i]}_${i + 1}@refillr.ph`,
        firstName: `Test${i + 1}`,
        lastName: `User${i + 1}`,
        role: roles[i]
      })
      users.push(user)
    }

    const merchantUser = users[0]
    const riderUser = users[1]
    const customerUser = users[2]

    // 4. Create Merchants (10 documents for the assignment)
    console.log('🏪 Seeding 10 merchant profiles...')
    const merchants = []
    const shopNames = [
      "Juan's LPG Center", "Cabanatuan Gas Hub", "Nueva Ecija Refill", 
      "Speedy Gas", "Reliable Refillr", "Metro LPG", "Baranggay Gasul",
      "Solane Express", "Petron Fiesta Dealer", "Green Energy LPG"
    ]

    for (let i = 0; i < 10; i++) {
      const merchant = await createTestMerchant({
        ownerUserId: users[i].clerkId, // Link each merchant to one of the 10 users
        shopName: shopNames[i],
        location: {
          type: 'Point',
          coordinates: [120.9734 + (Math.random() - 0.5) * 0.02, 15.4868 + (Math.random() - 0.5) * 0.02]
        },
        isVerified: i % 2 === 0,
        pricing: {
          'Gasul-11kg': 850 + (i * 5),
          'Solane-11kg': 870 + (i * 2),
          'Petron-11kg': 840 + (i * 3)
        }
      })
      merchants.push(merchant)
    }

    // 5. Create Rider
    console.log('🛵 Seeding rider profile...')
    await createTestRider({
      userId: riderUser.clerkId,
      firstName: 'Ricardo',
      lastName: 'Rider',
      isOnline: true,
      lastLocation: { type: 'Point', coordinates: [120.9700, 15.4800] }
    })

    // 6. Create Orders (10 documents for the assignment)
    console.log('📦 Seeding 10 sample orders...')
    for (let i = 0; i < 10; i++) {
      await createTestOrder({
        userId: customerUser.clerkId,
        merchantId: merchants[i % 10]._id,
        tankBrand: i % 2 === 0 ? 'Gasul' : 'Solane',
        tankSize: '11kg',
        status: i < 3 ? 'delivered' : (i < 6 ? 'accepted' : 'pending'),
        totalPrice: 850 + (i * 10),
        deliveryLocation: {
          type: 'Point',
          coordinates: [120.9734 + (Math.random() - 0.5) * 0.01, 15.4868 + (Math.random() - 0.5) * 0.01]
        }
      })
    }

    console.log('✅ Seeding completed successfully!')
    console.log('Created: 10 Merchants, 10 Orders, 1 Rider, 1 DOE Config.')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
  } finally {
    await closeDatabase()
    process.exit(0)
  }
}

seed()
