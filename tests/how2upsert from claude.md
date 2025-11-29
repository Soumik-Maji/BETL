# Upsert Test Datasets

## Dataset 1: Employee Records (Basic Sync)

### Target Table
```javascript
const employees = [
  { id: 1, name: "Alice", dept: "Engineering", salary: 90000, status: "Active" },
  { id: 2, name: "Bob", dept: "Sales", salary: 75000, status: "Active" },
  { id: 3, name: "Charlie", dept: "HR", salary: 65000, status: "Active" },
  { id: 4, name: "Diana", dept: "Engineering", salary: 95000, status: "Active" }
];
```

### Source Table
```javascript
const employeeUpdates = [
  { id: 1, name: "Alice", dept: "Engineering", salary: 95000, status: "Active" },  // Update salary
  { id: 2, name: "Bob", dept: "Marketing", salary: 80000, status: "Active" },      // Update dept & salary
  { id: 5, name: "Eve", dept: "Sales", salary: 70000, status: "Active" },          // New employee
  { id: 6, name: "Frank", dept: "Engineering", salary: 92000, status: "Active" }   // New employee
];
// Note: Charlie (id:3) and Diana (id:4) missing from source
```

### Test 1A: Full Sync (Update All, Insert New, Delete Orphaned)
```javascript
employees.upsert(UpsertConfig
  .source(employeeUpdates)
  .matchOn((t, s) => t.id === s.id)
  .whenMatched().updateAll()
  .whenNotMatched().insertAll()
  .whenNotMatchedBySource().delete()
)
```
**Expected Result**: Alice & Bob updated, Eve & Frank added, Charlie & Diana deleted

### Test 1B: Update Only (No Insert/Delete)
```javascript
employees.upsert(UpsertConfig
  .source(employeeUpdates)
  .matchOn((t, s) => t.id === s.id)
  .whenMatched().updateAll()
)
```
**Expected Result**: Alice & Bob updated, Charlie & Diana unchanged, Eve & Frank ignored

### Test 1C: Insert Only New Records
```javascript
employees.upsert(UpsertConfig
  .source(employeeUpdates)
  .matchOn((t, s) => t.id === s.id)
  .whenNotMatched().insertAll()
)
```
**Expected Result**: Eve & Frank added, existing employees unchanged

---

## Dataset 2: Job Runs (Selective Column Updates)

### Target Table
```javascript
const jobRuns = [
  { jobName: "ETL-Daily", instance: "2024-01-15", status: "Running", startTime: 1705305600000, endTime: null, duration: null },
  { jobName: "ETL-Daily", instance: "2024-01-14", status: "Success", startTime: 1705219200000, endTime: 1705222800000, duration: 3600000 },
  { jobName: "Report-Gen", instance: "2024-01-15", status: "Pending", startTime: null, endTime: null, duration: null }
];
```

### Source Table
```javascript
const jobUpdates = [
  { jobName: "ETL-Daily", instance: "2024-01-15", status: "Success", startTime: 1705305600000, endTime: 1705309200000 },  // Completed
  { jobName: "ETL-Daily", instance: "2024-01-16", status: "Running", startTime: 1705392000000, endTime: null },           // New run
  { jobName: "Report-Gen", instance: "2024-01-15", status: "Failed", startTime: 1705305600000, endTime: 1705306500000 }   // Failed
];
```

### Test 2A: Update Specific Columns
```javascript
jobRuns.upsert(UpsertConfig
  .source(jobUpdates)
  .matchOn((t, s) => t.jobName === s.jobName && t.instance === s.instance)
  .whenMatched()
    .updateSet("status", "status")
    .updateSet("endTime", "endTime")
    .updateExpr("duration", (t, s) => s.endTime ? s.endTime - t.startTime : null)
  .whenNotMatched().insertAll()
)
```
**Expected Result**:
- ETL-Daily 2024-01-15: status=Success, endTime updated, duration calculated
- Report-Gen 2024-01-15: status=Failed, endTime updated
- ETL-Daily 2024-01-16: inserted

---

## Dataset 3: Product Inventory (Conditional Delete)

### Target Table
```javascript
const inventory = [
  { sku: "A001", name: "Widget", stock: 100, price: 25.00, discontinued: false },
  { sku: "A002", name: "Gadget", stock: 50, price: 45.00, discontinued: false },
  { sku: "A003", name: "Gizmo", stock: 0, price: 30.00, discontinued: false },
  { sku: "A004", name: "Doohickey", stock: 200, price: 15.00, discontinued: false }
];
```

### Source Table
```javascript
const inventoryUpdates = [
  { sku: "A001", name: "Widget", stock: 150, price: 27.00, discontinued: false },    // Stock & price update
  { sku: "A002", name: "Gadget", stock: 30, price: 45.00, discontinued: true },      // Mark discontinued
  { sku: "A003", name: "Gizmo", stock: 0, price: 30.00, discontinued: true },        // Mark discontinued
  { sku: "A005", name: "Thingamajig", stock: 75, price: 20.00, discontinued: false } // New product
];
```

### Test 3A: Delete Discontinued Items
```javascript
inventory.upsert(UpsertConfig
  .source(inventoryUpdates)
  .matchOn((t, s) => t.sku === s.sku)
  .whenMatched()
    .deleteIf((t, s) => s.discontinued === true)
    .updateSet("stock", "stock")
    .updateSet("price", "price")
  .whenNotMatched().insertAll()
)
```
**Expected Result**:
- A001: updated
- A002 & A003: deleted
- A004: unchanged
- A005: inserted

### Test 3B: Conditional Update Based on Stock
```javascript
inventory.upsert(UpsertConfig
  .source(inventoryUpdates)
  .matchOn((t, s) => t.sku === s.sku)
  .whenMatched()
    .updateIf(
      (t, s) => s.stock > 0,
      { stock: "stock", price: "price", discontinued: "discontinued" }
    )
    .deleteIf((t, s) => s.stock === 0 && s.discontinued === true)
  .whenNotMatched().insertAll()
)
```
**Expected Result**:
- A001: updated (stock > 0)
- A002: updated (stock > 0)
- A003: deleted (stock = 0 and discontinued)
- A005: inserted

---

## Dataset 4: User Sessions (Soft Delete)

### Target Table
```javascript
const sessions = [
  { userId: 101, sessionId: "s001", active: true, lastSeen: 1705305600000 },
  { userId: 102, sessionId: "s002", active: true, lastSeen: 1705219200000 },
  { userId: 103, sessionId: "s003", active: true, lastSeen: 1705132800000 },
  { userId: 104, sessionId: "s004", active: false, lastSeen: 1705046400000 }
];
```

### Source Table (Active Sessions)
```javascript
const activeSessions = [
  { userId: 101, sessionId: "s001", lastSeen: 1705392000000 },  // Still active
  { userId: 105, sessionId: "s005", lastSeen: 1705392000000 }   // New session
];
```

### Test 4A: Soft Delete Inactive Sessions
```javascript
sessions.upsert(UpsertConfig
  .source(activeSessions)
  .matchOn((t, s) => t.userId === s.userId)
  .whenMatched()
    .updateSet("active", true)
    .updateSet("lastSeen", "lastSeen")
  .whenNotMatched()
    .insertExpr({
      userId: (s) => s.userId,
      sessionId: (s) => s.sessionId,
      active: () => true,
      lastSeen: (s) => s.lastSeen
    })
  .whenNotMatchedBySource()
    .updateSet("active", false)
    .updateExpr("lastSeen", () => Date.now())
)
```
**Expected Result**:
- 101: active=true, lastSeen updated
- 102, 103, 104: active=false
- 105: inserted

---

## Dataset 5: Complex Multi-Key Match

### Target Table
```javascript
const salesData = [
  { region: "North", product: "Widget", quarter: "Q1", revenue: 100000, units: 500 },
  { region: "North", product: "Gadget", quarter: "Q1", revenue: 150000, units: 300 },
  { region: "South", product: "Widget", quarter: "Q1", revenue: 80000, units: 400 },
  { region: "East", product: "Gizmo", quarter: "Q1", revenue: 120000, units: 600 }
];
```

### Source Table
```javascript
const salesUpdates = [
  { region: "North", product: "Widget", quarter: "Q1", revenue: 110000, units: 550 },     // Update
  { region: "North", product: "Gadget", quarter: "Q1", revenue: 150000, units: 300 },     // No change
  { region: "South", product: "Gadget", quarter: "Q1", revenue: 95000, units: 475 },      // New
  { region: "West", product: "Widget", quarter: "Q1", revenue: 105000, units: 525 }       // New region
];
```

### Test 5A: Multi-Key Match with Computed Column
```javascript
salesData.upsert(UpsertConfig
  .source(salesUpdates)
  .matchOn((t, s) =>
    t.region === s.region &&
    t.product === s.product &&
    t.quarter === s.quarter
  )
  .whenMatched()
    .updateSet("revenue", "revenue")
    .updateSet("units", "units")
    .updateExpr("avgPrice", (t, s) => s.revenue / s.units)
  .whenNotMatched()
    .insertExpr({
      region: (s) => s.region,
      product: (s) => s.product,
      quarter: (s) => s.quarter,
      revenue: (s) => s.revenue,
      units: (s) => s.units,
      avgPrice: (s) => s.revenue / s.units
    })
  .whenNotMatchedBySource().delete()
)
```
**Expected Result**:
- North/Widget: updated with avgPrice
- North/Gadget: unchanged (data identical)
- South/Widget: deleted
- East/Gizmo: deleted
- South/Gadget: inserted
- West/Widget: inserted

---

## Dataset 6: Conditional Insert

### Target Table
```javascript
const customers = [
  { customerId: 1, name: "Acme Corp", tier: "Gold", creditLimit: 50000 },
  { customerId: 2, name: "Beta Inc", tier: "Silver", creditLimit: 25000 },
  { customerId: 3, name: "Gamma LLC", tier: "Bronze", creditLimit: 10000 }
];
```

### Source Table
```javascript
const customerApplications = [
  { customerId: 1, name: "Acme Corp", tier: "Platinum", creditLimit: 100000 },       // Upgrade
  { customerId: 4, name: "Delta Co", tier: "Gold", creditLimit: 45000 },             // New - approved
  { customerId: 5, name: "Epsilon Ltd", tier: "Bronze", creditLimit: 5000 },         // New - below threshold
  { customerId: 6, name: "Zeta Industries", tier: "Silver", creditLimit: 30000 }     // New - approved
];
```

### Test 6A: Conditional Insert (Minimum Credit Limit)
```javascript
customers.upsert(UpsertConfig
  .source(customerApplications)
  .matchOn((t, s) => t.customerId === s.customerId)
  .whenMatched().updateAll()
  .whenNotMatched()
    .insertIf(
      (s) => s.creditLimit >= 10000,
      ["customerId", "name", "tier", "creditLimit"]
    )
)
```
**Expected Result**:
- Customer 1: upgraded to Platinum
- Customer 4: inserted (credit >= 10000)
- Customer 5: NOT inserted (credit < 10000)
- Customer 6: inserted (credit >= 10000)

---

## Dataset 7: Replace Pattern (Delete + Insert)

### Target Table
```javascript
const cache = [
  { key: "user:101", value: '{"name":"Alice","login":"2024-01-14"}', version: 1 },
  { key: "user:102", value: '{"name":"Bob","login":"2024-01-13"}', version: 1 },
  { key: "config:app", value: '{"theme":"dark","lang":"en"}', version: 2 }
];
```

### Source Table
```javascript
const cacheUpdates = [
  { key: "user:101", value: '{"name":"Alice","login":"2024-01-15","lastAction":"purchase"}', version: 2 },
  { key: "user:103", value: '{"name":"Charlie","login":"2024-01-15"}', version: 1 },
  { key: "config:app", value: '{"theme":"light","lang":"en","beta":true}', version: 3 }
];
```

### Test 7A: Replace Matched Rows Completely
```javascript
cache.upsert(UpsertConfig
  .source(cacheUpdates)
  .matchOn((t, s) => t.key === s.key)
  .whenMatched().delete()        // Remove old version
  .whenNotMatched().insertAll()  // Insert new version (includes non-matched from delete)
)
```
**Expected Result**:
- user:101: old deleted, new inserted (version 2)
- user:102: unchanged
- user:103: inserted
- config:app: old deleted, new inserted (version 3)

---

## Dataset 8: Multiple Actions in One Clause

### Target Table
```javascript
const orders = [
  { orderId: 1001, status: "Pending", amount: 250, lastUpdate: 1705305600000, notes: "" },
  { orderId: 1002, status: "Shipped", amount: 450, lastUpdate: 1705219200000, notes: "Express" },
  { orderId: 1003, status: "Pending", amount: 180, lastUpdate: 1705132800000, notes: "" },
  { orderId: 1004, status: "Delivered", amount: 320, lastUpdate: 1705046400000, notes: "Signed" }
];
```

### Source Table
```javascript
const orderUpdates = [
  { orderId: 1001, status: "Shipped", amount: 250, carrier: "FedEx" },
  { orderId: 1002, status: "Delivered", amount: 450, carrier: "UPS" },
  { orderId: 1003, status: "Cancelled", amount: 0, carrier: null },
  { orderId: 1005, status: "Pending", amount: 275, carrier: null }
];
```

### Test 8A: Multiple Updates + Conditional Delete
```javascript
orders.upsert(UpsertConfig
  .source(orderUpdates)
  .matchOn((t, s) => t.orderId === s.orderId)
  .whenMatched()
    .updateSet("status", "status")
    .updateSet("amount", "amount")
    .updateExpr("lastUpdate", () => Date.now())
    .updateExpr("notes", (t, s) => s.carrier ? `Shipped via ${s.carrier}` : t.notes)
    .deleteIf((t, s) => s.status === "Cancelled")
  .whenNotMatched().insertAll()
)
```
**Expected Result**:
- 1001: status=Shipped, notes="Shipped via FedEx", lastUpdate=now
- 1002: status=Delivered, notes="Shipped via UPS", lastUpdate=now
- 1003: DELETED
- 1004: unchanged
- 1005: inserted

---

## Summary of Test Coverage

| Test | Scenario | Features Tested |
|------|----------|----------------|
| 1A | Employee sync | updateAll, insertAll, delete (full sync) |
| 1B | Partial update | updateAll only |
| 1C | Insert only | insertAll only |
| 2A | Job runs | updateSet, updateExpr, insertAll |
| 3A | Product inventory | deleteIf, updateSet, insertAll |
| 3B | Conditional update | updateIf, deleteIf |
| 4A | User sessions | insertExpr, updateSet, soft delete pattern |
| 5A | Sales data | Multi-key match, updateExpr, delete orphans |
| 6A | Customer apps | insertIf (conditional insert) |
| 7A | Cache replace | delete + insertAll (replace pattern) |
| 8A | Orders | Multiple actions, updateExpr, deleteIf |

These datasets cover all major upsert patterns and edge cases!
