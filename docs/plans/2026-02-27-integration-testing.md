# Integration Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add integration tests that exercise server function business logic against a real local MongoDB instance (`refillr_test` database), covering merchant operations, rider operations, and order flows.

**Architecture:** Extract handler logic from `createServerFn` wrappers into standalone functions. Test those functions directly with a real MongoDB connection — no model mocking. Auth is simulated by passing `context` objects directly.

**Tech Stack:** Vitest 3, Mongoose 9 / Typegoose, local MongoDB (replica set at `localhost:27017`), Turf.js (geospatial assertions)

---

## Prerequisites

- Local MongoDB running as a replica set on `localhost:27017`
- No new npm dependencies required

---

### Task 1: Update Vitest Config and package.json

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json`

**Step 1: Add integration test script to package.json**

In `package.json`, add to `scripts`:
```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

**Step 2: Create vitest.integration.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist', '.git'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run integration test files sequentially (they share a DB)
    fileParallelism: false,
  },
})
```

**Step 3: Exclude integration tests from unit test config**

In `vitest.config.ts`, add to `test.exclude`:
```ts
exclude: ['node_modules', 'dist', '.git', 'src/**/*.integration.test.ts'],
```

**Step 4: Commit**
```
feat: add vitest integration test config
```

---

### Task 2: Create Test Infrastructure — DB Setup

**Files:**
- Create: `src/__tests__/integration/helpers/db-setup.ts`

**Step 1: Write the db setup helper**

```ts
import mongoose from 'mongoose'

const TEST_MONGODB_URI = 'mongodb://localhost:27017/refillr_test'

/**
 * Connect to the test database.
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
}

/**
 * Drop all collections in the test database.
 * Call in beforeEach() for full isolation between tests.
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
```

**Step 2: Commit**
```
feat: add test database connection helper
```

---

### Task 3: Create Test Infrastructure — Seed Factories

**Files:**
- Create: `src/__tests__/integration/helpers/seed.ts`

**Step 1: Write seed factory functions**

These insert real documents into the test DB and return them with `_id` populated.

```ts
import { MerchantModel } from '@/models/Merchant.server'
import { UserModel } from '@/models/User.server'
import { RiderModel } from '@/models/Rider.server'
import { OrderModel } from '@/models/Order.server'
import { Types } from 'mongoose'

// Default location: Cabanatuan City center
const DEFAULT_COORDS: [number, number] = [120.9734, 15.4868]

export async function createTestUser(overrides: Partial<{
  clerkId: string
  email: string
  firstName: string
  lastName: string
  role: 'customer' | 'merchant' | 'rider' | 'admin'
}> = {}) {
  return UserModel.create({
    clerkId: overrides.clerkId ?? `user_${new Types.ObjectId().toString()}`,
    email: overrides.email ?? `test-${Date.now()}@test.com`,
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
    role: overrides.role ?? 'customer',
  })
}

export async function createTestMerchant(overrides: Partial<{
  ownerUserId: string
  shopName: string
  doePermitNumber: string
  location: { type: 'Point'; coordinates: [number, number] }
  brandsAccepted: string[]
  pricing: Record<string, number>
  isOpen: boolean
  isVerified: boolean
  tankSizes: string[]
  deliveryRadiusMeters: number
  deliveryPolygon: any
}> = {}) {
  return MerchantModel.create({
    ownerUserId: overrides.ownerUserId ?? `user_${new Types.ObjectId().toString()}`,
    shopName: overrides.shopName ?? `Test Shop ${Date.now()}`,
    doePermitNumber: overrides.doePermitNumber ?? `DOE-${Date.now()}`,
    location: overrides.location ?? { type: 'Point', coordinates: DEFAULT_COORDS },
    brandsAccepted: overrides.brandsAccepted ?? ['Gasul', 'Solane'],
    pricing: overrides.pricing ?? { 'Gasul-11kg': 800, 'Solane-11kg': 850 },
    isOpen: overrides.isOpen ?? true,
    isVerified: overrides.isVerified ?? false,
    tankSizes: overrides.tankSizes ?? ['11kg'],
    deliveryRadiusMeters: overrides.deliveryRadiusMeters ?? 5000,
    ...(overrides.deliveryPolygon && { deliveryPolygon: overrides.deliveryPolygon }),
  })
}

export async function createTestRider(overrides: Partial<{
  userId: string
  firstName: string
  lastName: string
  phoneNumber: string
  vehicleType: 'motorcycle' | 'bicycle' | 'sidecar'
  isOnline: boolean
  lastLocation: { type: 'Point'; coordinates: [number, number] }
}> = {}) {
  return RiderModel.create({
    userId: overrides.userId ?? `user_${new Types.ObjectId().toString()}`,
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'Rider',
    phoneNumber: overrides.phoneNumber ?? '09171234567',
    vehicleType: overrides.vehicleType ?? 'motorcycle',
    isOnline: overrides.isOnline ?? true,
    ...(overrides.lastLocation && { lastLocation: overrides.lastLocation }),
  })
}

export async function createTestOrder(overrides: Partial<{
  userId: string
  merchantId: Types.ObjectId
  riderId: string
  tankBrand: string
  tankSize: string
  quantity: number
  totalPrice: number
  status: string
  deliveryLocation: { type: 'Point'; coordinates: [number, number] }
  deliveryAddress: string
}> = {}) {
  return OrderModel.create({
    userId: overrides.userId ?? 'user_123',
    merchantId: overrides.merchantId ?? new Types.ObjectId(),
    tankBrand: overrides.tankBrand ?? 'Gasul',
    tankSize: overrides.tankSize ?? '11kg',
    quantity: overrides.quantity ?? 1,
    totalPrice: overrides.totalPrice ?? 800,
    status: overrides.status ?? 'pending',
    deliveryLocation: overrides.deliveryLocation ?? { type: 'Point', coordinates: DEFAULT_COORDS },
    deliveryAddress: overrides.deliveryAddress ?? '123 Test Street, Cabanatuan City',
    ...(overrides.riderId && { riderId: overrides.riderId }),
  })
}
```

**Step 2: Commit**
```
feat: add integration test seed factories
```

---

### Task 4: Extract Handler Logic — Merchants

**Files:**
- Modify: `src/server/merchants.functions.ts`
- Create: `src/server/merchants.handlers.ts`

**Step 1: Create merchants.handlers.ts**

Extract the inner handler functions into standalone exports. Each function receives `{ data, context }` and operates on the real DB.

The server function file (`merchants.functions.ts`) will import these and delegate to them. The integration tests will import handlers directly.

Key handlers to extract:
- `handleGetNearbyMerchants({ data })`
- `handleGetMerchantById({ data })`
- `handleGetMyMerchant({ context })`
- `handleCreateMerchant({ data, context })`
- `handleUpdateMerchantPricing({ data })`
- `handleGetMerchantsInPolygon({ data })`
- `handleGetOrderAnalytics({ data })`
- `handleUpdateInventory({ data })`

**Step 2: Update merchants.functions.ts to use handlers**

Each `createServerFn` `.handler()` now calls the extracted handler.

**Step 3: Commit**
```
refactor: extract merchant handler logic into testable functions
```

---

### Task 5: Extract Handler Logic — Orders

**Files:**
- Modify: `src/server/orders.functions.ts`
- Create: `src/server/orders.handlers.ts`

Same pattern as Task 4. Key handlers:
- `handleCreateRefillRequest({ data, context })`
- `handleGetUserOrders({ context })`
- `handleGetMerchantOrders({ data })`
- `handleCancelOrder({ data, context })`
- `handleUpdateOrderStatus({ data, context })`
- `handleGetOrderById({ data, context })`

**Step 1: Create orders.handlers.ts with all handler logic**
**Step 2: Update orders.functions.ts to delegate to handlers**
**Step 3: Commit**
```
refactor: extract order handler logic into testable functions
```

---

### Task 6: Extract Handler Logic — Riders

**Files:**
- Modify: `src/server/rider.functions.ts`
- Create: `src/server/rider.handlers.ts`

Key handlers:
- `handleGetMyRider({ context })`
- `handleCreateRider({ data, context })`
- `handleUpdateRiderStatus({ data, context })`
- `handleUpdateRiderLocation({ data, context })`
- `handleGetNearbyRiders({ data })`
- `handleGetPendingOrdersNearby({ data, context })`
- `handleAcceptOrder({ data, context })`
- `handleMarkDispatched({ orderId, context })`
- `handleMarkDelivered({ orderId, context })`

**Step 1: Create rider.handlers.ts**
**Step 2: Update rider.functions.ts to delegate**
**Step 3: Commit**
```
refactor: extract rider handler logic into testable functions
```

---

### Task 7: Write Merchant Integration Tests

**Files:**
- Create: `src/__tests__/integration/merchants.integration.test.ts`

**Tests:**

1. **createMerchant — happy path**: create user, call handler, verify merchant persists in DB with correct ownerUserId
2. **createMerchant — duplicate**: call twice with same userId, second should throw
3. **getNearbyMerchants — geospatial**: seed 3 merchants at known coords (Cabanatuan center, 2km away, 10km away), query with 5km radius, verify only 2 returned
4. **getNearbyMerchants — brand filter**: seed merchants with different brands, filter by 'Gasul', verify correct filtering
5. **getMerchantById — found and not found**: seed merchant, query by ID, verify fields; query with random ID, verify null
6. **getMyMerchant — owner vs non-owner**: seed merchant, query as owner (returns merchant), query as different user (returns null)
7. **updateMerchantPricing**: seed merchant, update pricing, read back from DB and verify
8. **getMerchantsInPolygon**: seed merchants inside and outside a polygon, verify correct filtering
9. **updateInventory**: seed merchant, update tankSizes/brands, verify persistence
10. **getOrderAnalytics**: seed merchant + orders (mix of statuses, brands, sizes), verify totals, breakdowns, date filtering

**Step 1: Write all tests**
**Step 2: Run: `pnpm test:integration`**
**Step 3: Commit**
```
test: add merchant integration tests
```

---

### Task 8: Write Rider Integration Tests

**Files:**
- Create: `src/__tests__/integration/riders.integration.test.ts`

**Tests:**

1. **createRider — happy path + transaction**: create user, call handler, verify rider doc exists AND user.role changed to 'rider'
2. **createRider — duplicate**: call twice, second should return error object
3. **updateRiderStatus**: create rider, toggle online/offline, verify in DB
4. **updateRiderStatus — non-rider**: call with userId that has no rider profile, verify returns false
5. **updateRiderLocation**: create rider, update location, verify GeoJSON point persists
6. **getNearbyRiders — geospatial**: seed 3 riders (center, 2km, 10km), query with 5km radius, verify only online + nearby riders returned
7. **getNearbyRiders — offline filtered out**: seed online + offline riders at same location, verify only online returned
8. **getPendingOrdersNearby**: seed pending orders with delivery locations, verify spatial filtering + only pending status
9. **acceptOrder — happy path**: create pending order + rider, accept, verify status='accepted' and riderId set
10. **acceptOrder — race condition**: create pending order + 2 riders, both try to accept concurrently (Promise.all), verify only one succeeds
11. **acceptOrder — already accepted**: accept order, try again, verify 'no longer available' error
12. **markDispatched**: accept order, dispatch, verify status + dispatchedAt timestamp
13. **markDispatched — wrong rider**: rider A accepts, rider B tries to dispatch, verify returns false
14. **markDelivered**: dispatch order, deliver, verify status + deliveredAt timestamp
15. **Full lifecycle**: pending -> accepted -> dispatched -> delivered, verify all timestamps set

**Step 1: Write all tests**
**Step 2: Run: `pnpm test:integration`**
**Step 3: Commit**
```
test: add rider integration tests
```

---

### Task 9: Write Order Integration Tests

**Files:**
- Create: `src/__tests__/integration/orders.integration.test.ts`

**Tests:**

1. **createRefillRequest — happy path**: seed open merchant with brand/size/pricing, order within radius, verify order created with server-calculated price
2. **createRefillRequest — merchant closed**: seed closed merchant, verify error 'currently closed'
3. **createRefillRequest — brand not carried**: seed merchant without 'Petron', order Petron, verify error
4. **createRefillRequest — size not carried**: seed merchant without '50kg', order 50kg, verify error
5. **createRefillRequest — pricing not configured**: seed merchant without pricing for brand-size combo, verify error
6. **createRefillRequest — outside delivery radius**: seed merchant (5km radius), order from 8km away, verify error with distance message
7. **createRefillRequest — inside polygon**: seed merchant with deliveryPolygon, order from inside polygon, verify success
8. **createRefillRequest — outside polygon**: seed merchant with deliveryPolygon, order from outside, verify error
9. **createRefillRequest — server-side price calculation**: seed merchant with known pricing, verify totalPrice = unitPrice * quantity (never trust client)
10. **getUserOrders**: seed 3 orders for user A + 2 for user B, query as user A, verify only 3 returned sorted desc
11. **getMerchantOrders**: seed orders for 2 merchants, query for merchant A, verify correct filtering
12. **cancelOrder — pending**: create pending order, cancel as owner, verify status='cancelled'
13. **cancelOrder — not owner**: create order for user A, try cancel as user B, verify returns false
14. **cancelOrder — not pending**: create accepted order, try cancel as owner, verify returns false
15. **updateOrderStatus — RBAC merchant accepts**: merchant owner sets status to 'accepted', verify success
16. **updateOrderStatus — RBAC customer can't dispatch**: customer tries to set 'dispatched', verify returns false
17. **updateOrderStatus — RBAC rider dispatches**: assigned rider sets 'dispatched', verify success
18. **getOrderById — access control**: owner sees order, assigned rider sees order, merchant owner sees order, random user gets null

**Step 1: Write all tests**
**Step 2: Run: `pnpm test:integration`**
**Step 3: Commit**
```
test: add order integration tests
```

---

### Task 10: Final Verification

**Step 1: Run all unit tests**: `pnpm test` — verify existing unit tests still pass (no regressions from handler extraction)
**Step 2: Run all integration tests**: `pnpm test:integration` — verify all pass
**Step 3: Commit any final fixes**

---

## Execution Notes

- **Geospatial indexes**: The 2dsphere indexes on Merchant.location and Rider.lastLocation are created by Typegoose decorators when the model is first used. Integration tests that use `$nearSphere` need these indexes — they'll be auto-created on first insert.
- **Transaction tests**: Since the local MongoDB is a replica set, `withTransaction()` in `createRider` and `seedDOEPrices` will work correctly.
- **Test isolation**: `cleanTestDb()` in `beforeEach` drops all documents. Index definitions survive (they're on the collection schema, not the data).
- **No env var issues**: Integration tests connect directly via mongoose, bypassing `env.server.ts` validation. The test DB URI is hardcoded in the helper.
