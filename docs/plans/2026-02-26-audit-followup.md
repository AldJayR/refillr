# Audit Follow-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the three remaining action items from the previous audit session: env validation at startup, CommandMenu `onSelect` wiring, and eliminating `any` casts in orders/orders-adjacent files.

**Architecture:** Each task is independent and self-contained. No new routes or models needed. Changes touch at most 3 files each.

**Tech Stack:** TanStack Start, Zod, TypeScript, React, Mongoose/Typegoose

---

## Task 1: Env validation — fail fast at startup

**Context:** `src/lib/db.server.ts` silently falls back to `mongodb://localhost:27017` when `MONGODB_URI` is missing. There is no validated env schema anywhere. If `CLERK_SECRET_KEY` or `MAPBOX_ACCESS_TOKEN` are missing the app silently breaks at runtime. We need a single place that validates all required env vars at startup using Zod and throws a clear error message.

**Files:**
- Create: `src/lib/env.server.ts`
- Modify: `src/lib/db.server.ts` (import `env` instead of `process.env.MONGODB_URI`)

---

### Step 1: Create `src/lib/env.server.ts`

Write this file exactly:

```typescript
import { z } from 'zod'

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
  VITE_MAPBOX_TOKEN: z.string().min(1, 'VITE_MAPBOX_TOKEN is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  throw new Error(`[Refillr] Missing or invalid environment variables:\n${missing}`)
}

export const env = parsed.data
```

---

### Step 2: Update `src/lib/db.server.ts` to use `env`

Current line 12:
```typescript
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
```

Replace with:
```typescript
import { env } from '@/lib/env.server'
// ... (inside connectToDatabase)
const uri = env.MONGODB_URI
```

Full updated file:

```typescript
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
```

Note: the original file had a `MongoClient` import and a `client` variable that were unused (connectToDatabase uses mongoose, not MongoClient). `closeDatabase` also had a bug — it checked `client` (always null) instead of the mongoose connection. The updated version fixes both.

---

### Step 3: Run TypeScript check

```bash
npx tsc --noEmit --pretty false 2>&1 | head -60
```

Expected: no output (zero errors).

---

### Step 4: Commit

```bash
git add src/lib/env.server.ts src/lib/db.server.ts
git commit -m "feat: validate env vars at startup with Zod, fix closeDatabase"
```

---

## Task 2: Wire up `CommandMenu` `onSelect` to filter merchants

**Context:** The homepage's `CommandMenu` has `onSelect={(result) => console.log('Selected:', result)}` — it's a no-op. When the user picks a search result (e.g. "Gasul 11kg"), the map and merchant list should filter to only show merchants that carry that brand/size.

The `CommandMenu` emits a `SearchResult` with `type: 'brand' | 'size' | 'location'` and `label` (e.g. `"Gasul 11kg"` or `"11kg"`).

**Files:**
- Modify: `src/routes/index.tsx`

**Approach:**
- Add `activeFilter: SearchResult | null` state.
- Derive `filteredMerchants` from `merchants` filtered by `activeFilter`.
- Pass `filteredMerchants` to `Map` markers and the merchant list.
- Show a dismissible filter pill when a filter is active.

---

### Step 1: Add filter state and derived data to `Dashboard`

In `src/routes/index.tsx`, import `SearchResult` type from CommandMenu (it's not exported yet — add `export` to the interface).

**First, export `SearchResult` from `CommandMenu.tsx`:**

Change line 5 in `src/components/CommandMenu.tsx`:
```typescript
interface SearchResult {
```
to:
```typescript
export interface SearchResult {
```

**Then update `src/routes/index.tsx`:**

Add import:
```typescript
import type { SearchResult } from '@/components/CommandMenu'
```

Add state (after `selectedMerchant` state):
```typescript
const [activeFilter, setActiveFilter] = useState<SearchResult | null>(null)
```

Add derived `filteredMerchants` (replace the bare `merchants` references in `mapMarkers` and the list):
```typescript
const filteredMerchants = useMemo(() => {
  if (!activeFilter) return merchants
  if (activeFilter.type === 'brand') {
    // label is like "Gasul 11kg" or just "Gasul"
    const parts = activeFilter.label.toLowerCase().split(' ')
    const brand = parts[0]
    const size = parts[1] // may be undefined
    return merchants.filter((m) => {
      const hasBrand = m.brandsAccepted?.some((b: string) => b.toLowerCase() === brand)
      const hasSize = size ? m.tankSizes?.some((s: string) => s.toLowerCase() === size) : true
      return hasBrand && hasSize
    })
  }
  if (activeFilter.type === 'size') {
    return merchants.filter((m) =>
      m.tankSizes?.some((s: string) => s.toLowerCase() === activeFilter.label.toLowerCase())
    )
  }
  return merchants
}, [merchants, activeFilter])
```

Update `mapMarkers` to use `filteredMerchants`:
```typescript
const mapMarkers = useMemo(() => filteredMerchants.map((m) => ({
  id: m._id,
  coordinates: m.location.coordinates,
  shopName: m.shopName,
  isVerified: m.isVerified,
  isOpen: m.isOpen
})), [filteredMerchants])
```

Replace `onSelect` prop:
```typescript
onSelect={(result) => setActiveFilter(result)}
```

---

### Step 2: Add a filter-active pill under the search bar

After the `CommandMenu` `div`, add:
```tsx
{activeFilter && (
  <div className="flex items-center gap-2 mt-2">
    <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-3 py-1 flex items-center gap-1">
      {activeFilter.label}
      <button
        onClick={() => setActiveFilter(null)}
        className="ml-1 hover:text-white"
        aria-label="Clear filter"
      >
        ×
      </button>
    </span>
    <span className="text-xs text-slate-500">{filteredMerchants.length} result{filteredMerchants.length !== 1 ? 's' : ''}</span>
  </div>
)}
```

Also update the merchant list to use `filteredMerchants` instead of `merchants`:
```tsx
{filteredMerchants.length === 0 ? (
  <div className="text-center py-8 text-slate-500">
    {activeFilter ? `No dealers carry ${activeFilter.label} in your area.` : 'No dealers found in your area.'}
  </div>
) : filteredMerchants.map((merchant) => (
  // ... existing card JSX unchanged
))}
```

---

### Step 3: Run TypeScript check

```bash
npx tsc --noEmit --pretty false 2>&1 | head -60
```

Expected: no output.

---

### Step 4: Commit

```bash
git add src/components/CommandMenu.tsx src/routes/index.tsx
git commit -m "feat: wire CommandMenu onSelect to filter merchants by brand/size"
```

---

## Task 3: Eliminate remaining `any` casts in `orders.tsx`

**Context:** `src/routes/_authenticated/orders.tsx` uses `(o: any)` in three `.filter()` and `.map()` calls and inside `handleCancel`. The loader data is typed — we should derive the order type from the server function return value.

**Files:**
- Modify: `src/routes/_authenticated/orders.tsx`

---

### Step 1: Add a type alias at the top of the file

After the imports, add:
```typescript
import { getUserOrders } from '@/server/orders.functions'

type UserOrder = Awaited<ReturnType<typeof getUserOrders>>[number]
```

(The import already exists — just add the type alias line below it.)

---

### Step 2: Replace all `(o: any)` with `(o: UserOrder)`

There are 6 occurrences:
- Line 27: `orders.filter((o: any) => ...)` — pending
- Line 28: `orders.filter((o: any) => ...)` — active
- Line 29: `orders.filter((o: any) => ...)` — completed
- Line 35: `prev.map((o: any) => ...)` — optimistic cancel
- Line 51: `prev.map((o: any) => ...)` — rollback
- Line 57: `prev.map((o: any) => ...)` — rollback

Also update the `useState` to use the typed array:
```typescript
const [orders, setOrders] = useState<UserOrder[]>(initialOrders)
```

And fix the three `.map((order: any) => ...)` in the JSX render sections (lines ~87, ~136, ~174).

---

### Step 3: Run TypeScript check

```bash
npx tsc --noEmit --pretty false 2>&1 | head -60
```

Expected: no output.

---

### Step 4: Commit

```bash
git add src/routes/_authenticated/orders.tsx
git commit -m "refactor: replace any casts in orders.tsx with derived UserOrder type"
```

---

## Execution Order

Tasks can be executed in any order — they are fully independent. Recommended order: 1 → 3 → 2 (env first since it's pure infrastructure, then type cleanup, then the visible feature).

## Done Criteria

- `npx tsc --noEmit` exits with no output after each task
- No `any` type annotations remain in the three modified files
- Selecting a brand/size in the CommandMenu visibly narrows the map markers and merchant list
- Starting the dev server with `MONGODB_URI` unset throws a clear error instead of silently using localhost
