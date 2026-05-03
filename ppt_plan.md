# Refillr PPT Presentation Plan: NoSQL & MongoDB Case Study

**Target Audience:** Company IT Head (Academic Simulation)  
**Objective:** Demonstrate the technical and business superiority of NoSQL/MongoDB for Refillr's LPG delivery infrastructure.

---

## Slide 1: Title Slide
*   **Visual:** Refillr Logo + Project Tagline ("On-Demand Energy Infrastructure").
*   **Content:**
    *   Project Title: Refillr Case Study
    *   Module: Interface & NoSQL Implementation
    *   Group Members: [Names]
    *   Date: [Current Date]

---

## Slide 2: Business Overview (The "What")
*   **Objective:** Explain why Refillr exists and why data flexibility is key.
*   **Bullet Points:**
    *   **Nature of Business:** A marketplace for LPG (Liquefied Petroleum Gas) delivery in the Philippines.
    *   **Core Entities:** Customers, Verified Merchants (Dealers), and Delivery Riders.
    *   **The Data Challenge:** LPG pricing is highly volatile; merchants have different inventory types (2.7kg, 11kg, 50kg) and different operating hours.
*   **IT Head Note:** *"Traditional SQL systems struggle with the highly variable attributes of local LPG dealers. NoSQL allows us to pivot our data model instantly."*

---

## Slide 3: The Technical Choice: Why MongoDB?
*   **Comparison Point:** Document-Oriented vs. Relational.
*   **Content:**
    *   **Schema Flexibility:** Store diverse merchant profiles without `ALTER TABLE` commands.
    *   **Native Geospatial Support:** Built-in indexes for real-time rider and merchant tracking.
    *   **Scalability:** Horizontal scaling to handle peak cooking hours (lunch/dinner) when order volume spikes.
    *   **Consistency Model:** BASE (Basically Available, Soft-state, Eventual consistency) for live tracking; ACID where needed for payments.

---

## Slide 4: Interface & Connection (The PHP Bridge)
*   **Topic:** How the application "talks" to the database.
*   **Code Example (PHP):**
    ```php
    // Unified Technology: MongoDB PHP Driver
    $manager = new MongoDB\Driver\Manager("mongodb://localhost:27017");

    // Seamless JSON-to-BSON Interface
    $newOrder = [
        'tankBrand' => 'Gasul',
        'totalPrice' => 850.00,
        'location' => ['type' => 'Point', 'coordinates' => [120.97, 15.48]]
    ];
    ```
*   **Technical Highlight:** MongoDB returns JSON, which maps natively to PHP arrays. No complex mapping (ORM) is required, reducing latency and complexity.

---

## Slide 5: CRUD Operations Comparison (NoSQL vs SQL)
*   **Topic:** Comparing the fundamental data lifecycle.
*   **Table/Visual:**
    | Operation | SQL (Relational) | MongoDB (NoSQL) |
    | :--- | :--- | :--- |
    | **Create** | `INSERT INTO orders ...` (Strict Order) | `db.orders.insertOne({ ... })` (Decoupled) |
    | **Read** | `SELECT * FROM orders WHERE id = ?` | `db.orders.find({ _id: ID })` |
    | **Update** | `UPDATE orders SET status = 'Delivered'` | `db.orders.updateOne({ ... }, { $set: ... })` |
    | **Delete** | `DELETE FROM orders ...` | `db.orders.deleteOne({ ... })` |
*   **Insight:** SQL requires strict referential integrity; MongoDB offers "Document Independence."

---

## Slide 6: Advanced Operations: Aggregation & Analytics
*   **Topic:** Calculating business insights (Average prices/Stock levels).
*   **Code Comparison:**
    *   **SQL:** Uses `GROUP BY` and multiple `JOIN`s.
    *   **MongoDB Pipeline:** 
        ```javascript
        db.merchants.aggregate([
          { $match: { brandsAccepted: "Gasul" } },
          { $group: { _id: null, avgPrice: { $avg: "$price" }, maxPrice: { $max: "$price" } } }
        ]);
        ```
*   **IT Head Note:** *"Our aggregation pipelines process market trends in real-time without locking the orders table, keeping the app responsive for users."*

---

## Slide 7: Geospatial Implementation (The "Killer Feature")
*   **Topic:** How Refillr finds the closest LPG dealer.
*   **Visual:** A map screenshot with a radius circle.
*   **Code (PHP Syntax):**
    ```php
    $filter = ['location' => [
        '$nearSphere' => [
            '$geometry' => ['type' => 'Point', 'coordinates' => [120.97, 15.48]],
            '$maxDistance' => 5000 // 5km Radius
        ]
    ]];
    ```
*   **Advantage:** SQL requires the Haversine formula (Trigonometry) in the query; MongoDB handles it natively using a `2dsphere` index.

---

## Slide 8: 10-Document Insertion Simulation
*   **Topic:** Proving the interface works.
*   **Visuals:** 
    1.  Screenshot of the Web Form (User Input).
    2.  Screenshot of MongoDB Compass (Output).
*   **Script:** *"We have successfully simulated the insertion of 10 documents through our PHP interface. Notice that each document has a unique ObjectId and maintains geospatial integrity."*

---

## Slide 9: Conclusion & Q&A
*   **Summary:**
    *   NoSQL provides the flexibility needed for the Philippine LPG market.
    *   PHP and MongoDB offer a unified, JSON-native technology stack.
    *   Refillr is built to scale from one city to the entire country.
*   **Ending:** "Thank you for your time. Any questions regarding our infrastructure choice?"
