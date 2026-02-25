# Refillr Implementation Plan

## Current State ✅

| Item | Status |
|------|--------|
| **TanStack Start** | ✅ Configured |
| **Clerk Auth** | ✅ Installed, `.env` configured, middleware ready |
| **shadcn/ui components** | ✅ 12 components in `src/components/ui/` |
| **Utils (`cn()`)** | ✅ `src/lib/utils.ts` |
| **Auth Pages** | ✅ `/sign-in`, `/sign-up` routes |
| **Header** | ✅ Updated with Clerk `<SignedIn>`, `<SignedOut>`, `<UserButton>` |

---

## Phase 1: Database & Models (Priority: HIGH)

### 1.1 MongoDB Connection
- **File:** `src/lib/db.ts`
- Create MongoDB client connection using `mongodb` driver
- Implement connection pooling for production

### 1.2 Typegoose Models
Required schemas based on requirements.md:

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Merchant` | Gas dealers | `shopName`, `doePermitNumber`, `location` (GeoJSON), `brandsAccepted`, `deliveryPolygon`, `pricing` |
| `Order` | Refill requests | `userId`, `merchantId`, `tankType`, `brand`, `status`, `location`, `createdAt` |
| `User` | User profiles | `clerkId`, `savedAddresses[]` (with coordinates) |

### 1.3 Geospatial Indexes
- `Merchant.location` → `2dsphere` index
- Implement `$nearSphere` queries for proximity ranking
- Implement `$geoWithin` for geofencing

---

## Phase 2: Server Functions (Priority: HIGH)

Create server functions in `src/server/`:

| Function | Purpose | Auth |
|----------|---------|------|
| `getNearbyMerchants` | Find dealers within radius using `$nearSphere` | Public |
| `createRefillRequest` | Create new order | Clerk required |
| `cancelOrder` | Cancel order if not dispatched | Clerk required |
| `getUserOrders` | Fetch user's order history | Clerk required |
| `updateMerchantPricing` | Update daily prices | Merchant only |
| `getOrderAnalytics` | Sales data by area | Admin only |

---

## Phase 3: UI Components (Priority: HIGH)

### 3.1 Map Component
- **File:** `src/components/Map.tsx`
- Integrate Mapbox GL JS
- Display merchant pins
- Implement user location pinning
- Show delivery radius/geofence

### 3.2 Trust Badge Component
- **File:** `src/components/TrustBadge.tsx`
- Visual indicator for "DOE Verified" merchants

### 3.3 Command Menu (Smart Search)
- **File:** `src/components/CommandMenu.tsx`
- shadcn `Command` component
- Quick search: "Gasul 11kg", "Solane 2.7kg"

---

## Phase 4: Routes/Pages (Priority: HIGH)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Dashboard` | Map + nearby merchants |
| `/order/new` | `CreateOrder` | Pin location, select tank |
| `/orders` | `OrderHistory` | User's orders |
| `/profile` | `UserProfile` | Manage addresses |
| `/merchants` | `MerchantList` | Browse all merchants |
| `/merchant/dashboard` | `MerchantDashboard` | For dealers (protected) |

---

## Phase 5: Integration & Polish (Priority: MEDIUM)

### 5.1 Optimistic UI
- Use TanStack Query for optimistic updates on order creation
- Instant feedback while server processes

### 5.2 Theme
- Apply "Live-Flame" dark theme (slate-950, orange accents)
- Configure `next-themes` for dark/light mode

### 5.3 Environment Setup
- Update `.env` with real MongoDB Atlas URI
- Add real Mapbox token

---

## Implementation Order (Suggested)

```
1. Database Setup
   └── src/lib/db.ts
   └── src/models/Merchant.ts
   └── src/models/Order.ts
   └── src/models/User.ts

2. Server Functions
   └── src/server/merchants.ts
   └── src/server/orders.ts

3. Core UI
   └── src/components/Map.tsx
   └── src/components/TrustBadge.tsx

4. Pages
   └── src/routes/index.tsx (dashboard)
   └── src/routes/order.new.tsx
   └── src/routes/orders.tsx

5. Integration
   └── Optimistic updates
   └── Theme styling
```

---

## Questions

1. **MongoDB Atlas or Local?** - Should I set up Atlas connection string now, or use local MongoDB?
2. **Which tank brands to include initially?** - Based on requirements: Gasul, Solane, Petron. Add more?
3. **Mapbox token?** - Do you have one, or should we use a placeholder for now?
4. **Order of implementation?** - Should we go sequentially (phase by phase) or tackle multiple in parallel?
