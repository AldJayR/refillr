# 📝 Project Requirements Document: Refillr (PH)

**Project Name:** Refillr  
**Tagline:** *The On-Demand Energy Infrastructure for the Modern Filipino Home.*  
**Framework:** TanStack Start (Full-stack React)  
**Database:** MongoDB via Typegoose (Geospatial Indexed)  
**UI Library:** shadcn/ui + Tailwind CSS  

---

## 1. Executive Summary
**Refillr** is a "Logistics-as-a-Service" (LaaS) platform designed for the Philippine LPG (Liquefied Petroleum Gas) market. It digitizes the fragmented network of neighborhood gas dealers, providing households with a seamless, map-based interface to order cooking gas, track deliveries in real-time, and verify price compliance with Department of Energy (DOE) standards.

---

## 2. Real-World Pain Points (PH Context)
1.  **The "Middle-of-Cooking" Crisis:** LPG tanks often run out without warning, usually during peak meal prep times when finding an open dealer is difficult.
2.  **Price Opacity:** Small retailers often "over-price" during shortages. Users lack a central way to compare current market rates.
3.  **Safety & "Colorum" Tanks:** Illegal, under-filled, or poorly maintained tanks are a major fire hazard in high-density residential areas (Barangays).
4.  **Logistics Inefficiency:** Most dealers use "sidecar" motorcycles that roam aimlessly; Refillr optimizes these routes using proximity data.

---

## 3. Targeted UN Sustainable Development Goals (SDGs)
*   **SDG 7: Affordable and Clean Energy** – Ensuring households have consistent access to clean cooking fuel (LPG is cleaner than charcoal/wood).
*   **SDG 8: Decent Work & Economic Growth** – Empowering small "Mom-and-Pop" gas dealers with professional inventory and dispatch tools.
*   **SDG 11: Sustainable Cities and Communities** – Reducing urban traffic and emissions by matching orders to the *nearest* available dealer.
*   **SDG 12: Responsible Consumption & Production** – Tracking the lifecycle of steel cylinders to ensure proper maintenance and recycling.

---

## 4. User Personas

### 4.1 The Household (Consumer)
*   **Goal:** Get a 11kg Gasul/Solane tank delivered within 30 minutes at the lowest local price.
*   **Key Action:** Use the "Instant Refill" map to find the nearest open store.

### 4.2 The Merchant (Dealer/Shop Owner)
*   **Goal:** Manage inventory, update daily retail prices, and assign orders to riders.
*   **Key Action:** Monitor the "Demand Heatmap" to see which areas need more riders.

### 4.3 The Rider (Logistics)
*   **Goal:** Deliver tanks efficiently and earn commissions.
*   **Key Action:** Use geospatial navigation to find the customer's "pinned" location.

---

## 5. Functional Requirements (CRUD & Logic)

### 5.1 Marketplace (Customer)
*   **[CREATE] Refill Request:** User pins their location and selects tank type/brand.
*   **[READ] Nearby Discovery:** View a real-time list of dealers using MongoDB `$nearSphere` query.
*   **[UPDATE] Profile/Address:** Manage saved "Home" and "Office" coordinates.
*   **[DELETE] Cancel Order:** Revoke a request if the dealer hasn't dispatched a rider.

### 5.2 Operations (Merchant/Admin)
*   **[CREATE] Store Profile:** Register store location as a `GeoJSON Point`.
*   **[READ] Order Analytics:** View historical sales data within a specific `Polygon` (Barangay/City).
*   **[UPDATE] Live Pricing:** Update the daily price per brand (Gasul, Petron, Solane).
*   **[DELETE] Inventory Management:** Archive out-of-stock tank sizes.

### 5.3 Geospatial Logic
*   **Geofencing:** Dealers only receive orders that fall within their defined `$geoWithin` delivery polygon.
*   **Proximity Ranking:** Sort dealers by exact distance (meters) using TanStack Start's server-side logic and MongoDB aggregation.

---

## 6. Technical Specifications

### 6.1 The Stack
*   **Frontend/Backend:** **TanStack Start** (SSR for fast initial map load).
*   **ORM:** **Typegoose** for strictly-typed MongoDB schemas.
*   **Styling:** **shadcn/ui** (utilizing `Dialog`, `Toast`, `Sheet`, and `DataTable`).
*   **Maps:** **Mapbox GL JS** for rendering PH-specific map tiles and pins.
*   **Geospatial Tools:** **Turf.js** for client-side distance calculations.

### 6.2 MongoDB Geo-Schema (Typegoose)
```typescript
@index({ location: '2dsphere' }) // Enables $near queries
export class Merchant {
  @prop({ required: true })
  public shopName!: string;

  @prop({ required: true })
  public doePermitNumber!: string; // PH Regulatory Compliance

  @prop({ required: true, type: () => PointSchema })
  public location!: {
    type: "Point";
    coordinates: [number, number]; // [Longitude, Latitude]
  };

  @prop({ type: () => [String] })
  public brandsAccepted!: string[];
}
```

---

## 7. Key UI/UX Modules (SaaS Design)

1.  **The "Live-Flame" Dashboard:** A dark-themed map interface (slate-950) with orange accents, showing live riders and dealer pins.
2.  **Smart Search:** A command-menu (shadcn `Command`) to quickly search for "Gasul 11kg" or "Solane 2.7kg."
3.  **The "Trust Badge" System:** A UI component that highlights "DOE Verified" dealers to ensure safety.
4.  **Optimistic UI:** Using TanStack Query's optimistic updates so that when a user clicks "Order," the UI reflects success immediately while the server processes the geospatial logic.

---

## 8. Success Metrics for Case Study
*   **Technical Mastery:** Successful implementation of a `2dsphere` index and `$near` aggregation.
*   **Type Safety:** End-to-end type safety from the MongoDB document to the TanStack Start route loader.
*   **UX Performance:** Achieving a "Time to Interactive" (TTI) of under 2 seconds for the map view.
*   **Social Impact:** A clear demonstration of how Refillr addresses the high cost of energy and safety concerns in the Philippines.