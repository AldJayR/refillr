# ITIM03 Case Project - Interface Module Submission

**Project / Nature of Business:** Refillr (On-Demand LPG Delivery Platform)
**Group Members:** [Insert Names Here]

---

## Task 1: Describe NoSQL Technology

**a. In terms of data handled and volume of data**
NoSQL databases are designed to handle massive volumes of unstructured, semi-structured, and rapidly changing data without performance degradation. Unlike traditional relational databases that require strict schemas, NoSQL uses flexible data models. For Refillr, this allows us to easily scale our user and merchant data across the entire region, accommodating varying business details (like different tank sizes or pricing models) without constantly altering table structures.

**b. ACID vs BASE**
While relational databases rely on ACID (Atomicity, Consistency, Isolation, Durability) for strict data integrity, NoSQL generally follows the BASE model (Basically Available, Soft-state, Eventual consistency). BASE prioritizes high availability and performance over immediate consistency. In the context of Refillr, eventual consistency is perfectly acceptable for live-tracking rider locations, ensuring the system remains highly available during peak cooking hours even if a rider's map pin lags by a few milliseconds.

**c. Scalabilities**
NoSQL databases excel at horizontal scaling (scaling out), meaning they handle increased traffic by distributing the data across multiple cheaper servers rather than upgrading a single expensive server (vertical scaling). This horizontal scalability ensures that as Refillr expands to new cities and handles thousands of concurrent orders, the database can grow seamlessly by simply adding more nodes to the cluster.

**d. Distribution models**
NoSQL utilizes distribution models like sharding and replication to manage data across multiple servers. Sharding partitions data into smaller chunks distributed across nodes to balance the load, while replication creates copies of data across different servers for fault tolerance. For Refillr, this means if a database server in one region goes down, replicated data ensures the LPG ordering system remains online.

**e. Consistency types**
NoSQL systems typically offer tunable consistency, ranging from strong consistency to eventual consistency. Eventual consistency guarantees that if no new updates are made, all accesses will eventually return the last updated value. For Refillr's order processing, we enforce strong consistency to ensure users aren't double-charged, but we utilize eventual consistency for features like updating the "nearby merchants" list.

---

## Task 2: Discuss the 4 different technologies

1. **Key-Value Stores:** Data is stored as a collection of key-value pairs, making it incredibly fast for simple lookups (e.g., caching session tokens).
2. **Wide-Column Stores:** Data is organized into tables, rows, and dynamic columns, optimized for querying large datasets over distributed architectures.
3. **Graph Databases:** Designed to handle highly interconnected data using nodes, edges, and properties, perfect for social networks or recommendation engines.
4. **Document-Oriented Databases:** Data is stored in flexible, JSON-like documents. **Refillr uses a Document-Oriented database (MongoDB)** because LPG orders and merchant profiles have varying attributes, making JSON documents the most natural fit for our data.

---

## Task 3: MongoDB Geospatial Data

MongoDB provides native support for geospatial data, allowing developers to store location coordinates and execute highly optimized spatial queries. Locations are typically stored using the `GeoJSON Point` format (`[longitude, latitude]`), and MongoDB uses specialized `2dsphere` indexes to calculate geometries on an earth-like sphere. 

For Refillr, this is critical. We use geospatial queries to instantly calculate the distance between a customer and all LPG dealers to find the closest available merchant.

**Code Sample:**
```javascript
// Finds Refillr LPG dealers within 5000 meters of the customer's location
db.merchants.find({
  location: {
    $nearSphere: {
      $geometry: { type: "Point", coordinates: [120.9734, 15.4868] },
      $maxDistance: 5000
    }
  }
}).pretty();
```

---

## Task 4: MongoDB vs. Relational Databases (Similarities & Differences)

### a. Structure
**Explanation:** 
*   **Similarity:** Both systems organize data into logical containers to keep related information together.
*   **Difference:** SQL uses **Tables** with a fixed schema. MongoDB uses **Collections** with flexible **Documents**.

**Code (MongoDB):**
```json
{ "name": "Refillr", "version": 1.0, "active": true }
```

**Code (SQL):**
```sql
CREATE TABLE apps (id INT PRIMARY KEY, name VARCHAR(50), version FLOAT, active BOOLEAN);
INSERT INTO apps VALUES (1, 'Refillr', 1.0, true);
```

**Output:**
*   **MongoDB:** Returns a JSON document with a generated `_id`.
*   **SQL:** Adds a row to a strictly typed table.

### b. Database Commands
**Explanation:**
*   **Similarity:** Both require administrative commands to manage data containers.
*   **Difference:** SQL uses DDL keywords; MongoDB uses JavaScript methods on the `db` object.

**Code & Output (MongoDB):**
```javascript
use test_db                      // Output: switched to db test_db
db.createCollection("users")     // Output: { "ok" : 1 }
db.users.drop()                  // Output: true
db.dropDatabase()                // Output: { "dropped" : "test_db", "ok" : 1 }
```

**Code & Output (SQL):**
```sql
CREATE DATABASE test_db;         // Output: Query OK, 1 row affected
USE test_db;                     // Output: Database changed
CREATE TABLE users (id INT);     // Output: Query OK, 0 rows affected
DROP TABLE users;                // Output: Query OK, 0 rows affected
DROP DATABASE test_db;           // Output: Query OK, 0 rows affected
```

### c. CRUD Operations
**Explanation:**
*   **Similarity:** Both provide foundational Create, Read, Update, and Delete capabilities.
*   **Difference:** SQL is declarative (text-based); MongoDB is functional (object-based).

**Code (MongoDB):**
```javascript
db.items.insertOne({ name: "A" })
db.items.find({ name: "A" })
db.items.updateOne({ name: "A" }, { $set: { qty: 10 } })
db.items.deleteOne({ name: "A" })
```

**Code (SQL):**
```sql
INSERT INTO items (name) VALUES ('A');
SELECT * FROM items WHERE name = 'A';
UPDATE items SET qty = 10 WHERE name = 'A';
DELETE FROM items WHERE name = 'A';
```

**Output:**
*   **MongoDB:** Returns objects like `{ "insertedId": ... }` or `{ "modifiedCount": 1 }`.
*   **SQL:** Returns status messages like `Query OK, 1 row affected`.

### d. Aggregate Functions
**Explanation:**
*   **Similarity:** Both MongoDB and Relational databases provide built-in functions to summarize data, such as finding totals, averages, and extremes.
*   **Difference:** SQL uses aggregate functions in `SELECT` with `GROUP BY`. MongoDB uses the **Aggregation Pipeline** with accumulator stages.

**1. Count**
- **MongoDB:** `db.orders.countDocuments({})`
- **Output:** `10`
- **SQL:** `SELECT COUNT(*) FROM orders;`

**2. Average**
- **MongoDB:** `db.orders.aggregate([{ $group: { _id: null, avgPrice: { $avg: "$totalPrice" } } }])`
- **Output:** `{ "avgPrice": 850 }`
- **SQL:** `SELECT AVG(totalPrice) FROM orders;`

**3. Min**
- **MongoDB:** `db.orders.aggregate([{ $group: { _id: null, minPrice: { $min: "$totalPrice" } } }])`
- **Output:** `{ "minPrice": 700 }`
- **SQL:** `SELECT MIN(totalPrice) FROM orders;`

**4. Max**
- **MongoDB:** `db.orders.aggregate([{ $group: { _id: null, maxPrice: { $max: "$totalPrice" } } }])`
- **Output:** `{ "maxPrice": 1100 }`
- **SQL:** `SELECT MAX(totalPrice) FROM orders;`

### e. Connection to Various Interfaces (1 Technology: PHP MongoDB Driver)
**Explanation:**
*   **Similarity:** Both MongoDB and Relational databases can be connected to the same application technology (**PHP**) to handle data operations from various user interfaces.
*   **Difference:** The **"Interface Gap."** Relational databases require a complex **Transformation Interface** (like PDO or an ORM) to map their rigid rows and columns into PHP objects. MongoDB, however, is **"BSON-Native."** Because its internal BSON format maps **natively** to PHP's associative arrays, the interface is much simpler and faster. You use the **1 Technology (The MongoDB PHP Driver)** to interact with the database using the same logic as your application variables.

**Code (MongoDB - Native PHP Interface):**
```php
<?php
// MongoDB Driver connects natively and returns data as PHP Arrays/Objects
$manager = new MongoDB\Driver\Manager("mongodb://localhost:27017");
$query = new MongoDB\Driver\Query(['status' => 'pending']);
$cursor = $manager->executeQuery('refillr.orders', $query);

foreach ($cursor as $document) {
    echo $document->tankBrand; // Native object access
}
?>
```

**Code (SQL - Fragmented PHP Interface):**
```php
<?php
// SQL requires PDO to map result sets into objects
$pdo = new PDO('mysql:host=localhost;dbname=refillr', 'user', 'pass');
$stmt = $pdo->query("SELECT * FROM orders WHERE status = 'pending'");

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['tank_brand']; // Requires manual fetching and mapping
}
?>
```

**Output:**
*   **MongoDB:** A direct, high-performance pipeline where the database data and PHP code "speak the same language."
*   **SQL:** A fragmented interface that requires constant data translation between relational rows and PHP arrays.

---

## Task 5: Additional Requirements

### a. Functional Interface
*(Include Screenshot of the "New Order" or "Merchant Registration" Form here)*

**Code snippet for the Interface Module (PHP / MongoDB Driver):**
```php
<?php
// Location: api/create_order.php
// This script acts as the functional interface for accepting user input

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $manager = new MongoDB\Driver\Manager("mongodb://localhost:27017");
    
    // Capture user input from the HTML form
    $new_order = [
        'userId' => $_POST['userId'],
        'tankBrand' => $_POST['brand'],
        'tankSize' => $_POST['size'],
        'quantity' => (int)$_POST['qty'],
        'totalPrice' => (float)$_POST['price'],
        'status' => 'pending',
        'createdAt' => new MongoDB\BSON\UTCDateTime()
    ];

    // Prepare the insertion into the 'orders' collection
    $bulk = new MongoDB\Driver\BulkWrite;
    $bulk->insert($new_order);
    
    $result = $manager->executeBulkWrite('refillr.orders', $bulk);
    
    echo json_encode([
        "status" => "Success", 
        "inserted_count" => $result->getInsertedCount()
    ]);
}
?>
```

### b. Data Model
Refillr primarily uses a **Normalized** data model. Instead of embedding an entire merchant's profile inside every single order document, the `orders` collection simply stores a reference (`merchantId`) to the merchant. This ensures that if a merchant updates their shop name, we don't have to update thousands of historical order documents.

### c. 1 Database and 3 Collections
**Database:** `refillr`
**Collections:**
1. `users` (Customer profiles)
2. `merchants` (LPG Dealer details and locations)
3. `orders` (LPG refill requests)

### d. 10 Documents per collection
*(Include Screenshot of MongoDB Compass or Shell showing 10 documents in users, merchants, and orders collections. These were generated using our custom seed script).*

### e. Five variations of find() and SQL Counterparts

| Description | NoSQL Variation (MongoDB) | SQL Counterpart (Relational) |
| :--- | :--- | :--- |
| **Equality Filter** | `db.users.find({ role: "rider" })` | `SELECT * FROM users WHERE role = 'rider'` |
| **Sort & Limit** | `db.orders.find().sort({ createdAt: -1 }).limit(5)` | `SELECT * FROM orders ORDER BY created_at DESC LIMIT 5` |
| **Set Membership** | `db.orders.find({ tankBrand: { $in: ["Gasul", "Solane"] } })` | `SELECT * FROM orders WHERE tank_brand IN ('Gasul', 'Solane')` |
| **Inequality Filter** | `db.orders.find({ status: { $ne: "cancelled" } })` | `SELECT * FROM orders WHERE status <> 'cancelled'` |
| **Pattern Matching** | `db.merchants.find({ shopName: /LPG/i })` | `SELECT * FROM merchants WHERE shop_name LIKE '%LPG%'` |

**Explanation of Variations:**
1.  **Equality Filter**: Used to retrieve documents where a field exactly matches a specific value, such as identifying all users registered as riders.
2.  **Sort & Limit**: Demonstrates how to organize results (e.g., by most recent date) and restrict the output to a specific number of records, useful for "Latest Activity" lists.
3.  **Set Membership ($in)**: Filters for documents where a field contains any value from a provided list, such as finding orders for specific LPG brands.
4.  **Inequality Filter ($ne)**: Allows the exclusion of specific data points, such as filtering out cancelled orders to focus only on active transactions.
5.  **Pattern Matching (Regex)**: Employs regular expressions to find documents that contain a specific substring or pattern, such as identifying merchants with "LPG" in their business name.

### f. Five different operators

1.  **`$in` (Set Membership)**: `db.orders.find({ tankBrand: { $in: ["Solane", "Petron"] } })`
    - *Explanation:* Matches any order that belongs to a specific list of options, such as finding only Solane or Petron tanks while ignoring others.
2.  **`$gt` (Greater Than)**: `db.orders.find({ totalPrice: { $gt: 1000 } })`
    - *Explanation:* Finds records where a number is larger than a specific value, used to filter for high-value orders costing more than 1,000 pesos.
3.  **`$or` (Logical OR)**: `db.orders.find({ $or: [{ status: "pending" }, { status: "accepted" }] })`
    - *Explanation:* Retrieves data that meets at least one of several conditions, such as showing orders that are either still waiting or already being processed.
4.  **`$exists` (Field Check)**: `db.merchants.find({ pricing: { $exists: true } })`
    - *Explanation:* Checks if a specific category of information is present in the record, ensuring we only view merchants who have completed their pricing setup.
5.  **`$nearSphere` (Geospatial)**: `db.merchants.find({ location: { $nearSphere: { $geometry: { type: "Point", coordinates: [120.9734, 15.4868] }, $maxDistance: 5000 } } })`
    - *Explanation:* Finds locations within a specific distance from a point on a map, used to show customers the gas dealers closest to their current home location.
