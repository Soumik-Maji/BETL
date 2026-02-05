import { ObjectArray } from "../../scripts/ObjectArray.js";
import { MergeGenerator } from "../../scripts/util/manipulator-functions/merge.js";

export async function main() {
    // test1();    // PASSED
    // test2();    // PASSED
    // test3();    // PASSED
    // test4();    // PASSED
    // test5();    // PASSED
    // test6();    // PASSED
    // test7();    // PASSED
    // test8();    // PASSED
    // test9();    // should fail so - PASSED
    // test10();   // should fail as has mulitple target matched - PASSED
    // test11();   // MAYBE PASSED
    // test12();   // should fail as has mulitple target matched - PASSED
    // test13();   // cardinality error thrown - PASSED
    // test14();   // 2nd when update statement gives an interesting behaviour, otherwise OK - MOST PROBABLY PASSED
    // test15();   // PASSED
    // test16();   // PASSED
    // test17();   // PASSED
    // test18();   // PASSED
    // test19();   // PASSED
    // test20();   // cardinality error thrown - PASSED
    // test21();   // PASSED
    // test22();   // should fail as non-existent column accessed - PASSED
}

function test22() {
    // rename interchange the source & target vars to see the difference
    // working as expected
    const target = ObjectArray.createEmptyInstance("id", "status");
    const source = ObjectArray.createInstance([
        { id: 1, status: "active" },
        { id: 2, status: "active" },
        { id: 3, status: "active" }
    ]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.id === s.i)
            .presentInBoth()
            .update("status", () => "starting")

            .presentInSource()
            .insert()

            .presentInTarget()
            .update("status", () => "discontinued")
    )
        .log();
}

function test21() {
    console.log("Insert blocked for presentInTarget context");

    const target = ObjectArray.createInstance([
        { id: 1, status: "active" },
        { id: 2, status: "active" },
        { id: 3, status: "active" }
    ]);
    const source = ObjectArray.createInstance([{ id: 3, status: "wip" }, { id: 4, status: "p" }]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.id === s.id)
            .presentInBoth()
            .update("status", () => "working")

            .presentInSource()
            .insert("id", "id")
            .insert("status", () => "pending")

            .presentInTarget()
            // .update()
            // .update("status", "status")
            .update("status", () => "discontinued")
        // .update("id", t => "ud:" + t.id)
        // .insert()   // block this for presentInTarget context
        // .insert("status", "status") // throwing error about cannot read null but block
        // .insert("id", t => "d:" + t.id)
    )
        .updateColumn("id", row => String(row.id))
        .log();
}

function test13() {
    // Test: Cardinality check with composite keys
    const target = ObjectArray.createInstance([
        { region: "North", product: "Widget", stock: 100 },
        { region: "North", product: "Widget", stock: 200 }  // duplicate composite key
    ]);
    const source = ObjectArray.createInstance([
        { region: "North", product: "Widget", stock: 150 }
    ]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.region === s.region && t.product === s.product)
            .presentInBoth()
            .update("stock", "stock")
    ).log();
    // Should throw: Cardinality violation on composite key
}

function test14() {
    // Test: Multiple when() conditions with same context - all should execute independently
    const target = ObjectArray.createInstance([
        { id: 1, price: 100, stock: 50 },
        { id: 2, price: 200, stock: 0 },
        { id: 3, price: 300, stock: 100 }
    ]);
    const source = ObjectArray.createInstance([
        { id: 1, discount: 10 },
        { id: 2, discount: 20 },
        { id: 3, discount: 30 }
    ]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.id === s.id)
            .presentInBoth()
            .when((t, s) => t.price > 150).update("price", (t, s) => t.price - s.discount)
            .when((t, s) => t.price > 150).update("stock", (t, s) => "sold out")
            .when((t, s) => t.stock === 0).update("stock", () => 10)  // different condition
    ).log();
    // Expected: id:1 unchanged (price<=150, stock>0), id:2 stock->10 (price>150 but stock=0), id:3 price->270 (price>150)
}

function test15() {
    // Test: presentInTarget with specific column update (valid use case)
    const sessions = ObjectArray.createInstance([
        { userId: 101, active: true, lastSeen: 1000 },
        { userId: 102, active: true, lastSeen: 2000 },
        { userId: 103, active: true, lastSeen: 3000 }
    ]);
    const activeSessions = ObjectArray.createInstance([
        { userId: 101, lastSeen: 5000 }  // only userId 101 is active
    ]);

    sessions.merge(
        MergeGenerator.source(activeSessions, (t, s) => t.userId === s.userId)
            .presentInBoth()
            .update("lastSeen", "lastSeen")

            .presentInTarget()
            .update("active", () => false)  // Should work - computed value
    ).log();
    // Expected: userId 101 has active:true & lastSeen:5000, others have active:false
}

function test16() {
    // Test: Empty source, operations on presentInTarget only
    const products = ObjectArray.createInstance([
        { id: 1, stock: 10, discontinued: false },
        { id: 2, stock: 0, discontinued: false },
        { id: 3, stock: 5, discontinued: false }
    ]);
    const updates = ObjectArray.createEmptyInstance("id", "stock", "discontinued");

    products.merge(
        MergeGenerator.source(updates, (t, s) => t.id === s.id)
            .presentInTarget()
            .when(t => t.stock === 0).update("discontinued", () => true)
    ).log();
    // Expected: Only id:2 gets discontinued:true, others unchanged
}

function test17() {
    // Test: presentInSource with when() condition - conditional insert
    const inventory = ObjectArray.createInstance([
        { sku: "A001", stock: 100 }
    ]);
    const newProducts = ObjectArray.createInstance([
        { sku: "A002", stock: 50, approved: true },
        { sku: "A003", stock: 30, approved: false },  // Should not insert
        { sku: "A004", stock: 80, approved: true }
    ]);

    inventory.merge(
        MergeGenerator.source(newProducts, (t, s) => t.sku === s.sku)
            .presentInSource()
            .when(s => s.approved === true)
            .insert("sku", "sku")
            .insert("stock", "stock")
    ).log();
    // Expected: Only A002 and A004 inserted, A003 skipped
}

function test18() {
    // Test: resetWhenCondition() actually resets
    const data = ObjectArray.createInstance([
        { id: 1, status: "A", value: 10 },
        { id: 2, status: "B", value: 20 }
    ]);
    const updates = ObjectArray.createInstance([
        { id: 1, status: "A", value: 15 },
        { id: 2, status: "B", value: 25 }
    ]);

    data.merge(
        MergeGenerator.source(updates, (t, s) => t.id === s.id)
            .presentInBoth()
            .when((t, s) => s.status === "A").update("value", (t, s) => s.value + 100)  // Only id:1
            .resetWhenCondition()
            .update("status", "status")  // Both rows - no condition
    ).log();
    // Expected: id:1 -> value:115, status:A; id:2 -> value:20, status:B
}

function test19() {
    // Test: Delete with when() in presentInBoth
    const tasks = ObjectArray.createInstance([
        { taskId: 1, status: "pending", priority: 1 },
        { taskId: 2, status: "done", priority: 2 },
        { taskId: 3, status: "pending", priority: 3 }
    ]);
    const taskUpdates = ObjectArray.createInstance([
        { taskId: 1, status: "done", priority: 1 },
        { taskId: 2, status: "archived", priority: 2 },  // Should delete
        { taskId: 3, status: "in-progress", priority: 3 }
    ]);

    tasks.merge(
        MergeGenerator.source(taskUpdates, (t, s) => t.taskId === s.taskId)
            .presentInBoth()
            .when((t, s) => s.status === "archived").delete()
            .resetWhenCondition()
            .update()  // Update all non-archived
    ).log();
    // Expected: taskId:2 deleted, others updated
}

function test20() {
    // Test: Source has duplicate that matches different targets (should fail)
    const accounts = ObjectArray.createInstance([
        { accountId: 1, type: "savings", balance: 1000 },
        { accountId: 2, type: "checking", balance: 500 }
    ]);
    const transactions = ObjectArray.createInstance([
        { type: "savings", amount: 100 },  // Matches accountId:1
        { type: "savings", amount: 200 }   // Also matches accountId:1 - DUPLICATE!
    ]);

    accounts.merge(
        MergeGenerator.source(transactions, (t, s) => t.type === s.type)
            .presentInBoth()
            .update("balance", (t, s) => t.balance + s.amount)
    ).log();
    // Should throw: Cardinality violation - multiple sources match target
}

function test12() {
    const target = ObjectArray.createInstance([{ id: 1, status: "active" }, { id: 1, status: "online" }]);
    const source = ObjectArray.createInstance([{ id: 1, status: "inactive" }]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.id === s.id)
            .presentInBoth()
            .when((t, s) => t.status === "active").update("id", () => 99)
            .when((t, s) => t.status === "online").update("id", () => 44)
    ).log();

}

function test11() {
    const target = ObjectArray.createEmptyInstance("id");
    const source = ObjectArray.createInstance([{ id: 1 }]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.id === s.id)
            .presentInSource()
            .insert("id", "id")
    ).log();

    // with presentInSource().insert()
}

function test10() {
    const target = ObjectArray.createInstance([
        { id: 1, name: "Alice" },
        { id: 1, name: "Alice Duplicate" }  // duplicate ID
    ]);
    const source = ObjectArray.createInstance([{ id: 1, name: "Active" }]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.id === s.id)
            .presentInBoth()
            .update("name", "name")
    ).log();
}

function test9() {
    const target = ObjectArray.createInstance([{ id: 1, name: "Alice" }]);
    const source = ObjectArray.createInstance([
        { id: 1, name: "A" },
        { id: 1, name: "B" }  // duplicate match
    ]);

    target.merge(
        MergeGenerator.source(source, (t, s) => t.id === s.id)
            .presentInBoth()
            .update("name", "name")
    ).log();
}

function test8() {
    const orders = ObjectArray.createInstance([
        { orderId: 1001, status: "Pending", amount: 250, lastUpdate: 1705305600000, notes: "" },
        { orderId: 1002, status: "Shipped", amount: 450, lastUpdate: 1705219200000, notes: "Express" },
        { orderId: 1003, status: "Pending", amount: 180, lastUpdate: 1705132800000, notes: "" },
        { orderId: 1004, status: "Delivered", amount: 320, lastUpdate: 1705046400000, notes: "Signed" }
    ]);
    const orderUpdates = ObjectArray.createInstance([
        { orderId: 1001, status: "Shipped", amount: 250, carrier: "FedEx" },
        { orderId: 1002, status: "Delivered", amount: 450, carrier: "UPS" },
        { orderId: 1003, status: "Cancelled", amount: 0, carrier: null },
        { orderId: 1005, status: "Pending", amount: 275, carrier: null }
    ]);
    showInput(orders, orderUpdates);

    console.log("Test 8A: Multiple Updates + Conditional Delete");
    orders.merge(
        MergeGenerator.source(orderUpdates, (t, s) => t.orderId === s.orderId)
            .presentInBoth()
            .update("status", "status")
            .update("amount", "amount")
            .update("lastUpdate", () => Date.now())
            .update("notes", (t, s) => (t.notes === "" ? "" : t.notes + " | ") + (s.carrier ? "Shipped by: " + s.carrier : ""))
            .when((t, s) => s.status === "Cancelled").delete()

            .presentInSource()
            .insert("orderId", "orderId")
            .insert("status", "status")
            .insert("amount", "amount")
            .insert("lastUpdate", () => Date.now())
    ).log();
}

function test7() {
    const cache = ObjectArray.createInstance([
        { key: "user:101", value: '{"name":"Alice","login":"2024-01-14"}', version: 1 },
        { key: "user:102", value: '{"name":"Bob","login":"2024-01-13"}', version: 1 },
        { key: "config:app", value: '{"theme":"dark","lang":"en"}', version: 2 }
    ]);
    const cacheUpdates = ObjectArray.createInstance([
        { key: "user:101", value: '{"name":"Alice","login":"2024-01-15","lastAction":"purchase"}', version: 2 },
        { key: "user:103", value: '{"name":"Charlie","login":"2024-01-15"}', version: 1 },
        { key: "config:app", value: '{"theme":"light","lang":"en","beta":true}', version: 3 }
    ]);
    showInput(cache, cacheUpdates);

    console.log("Test 7A: Replace Matched Rows Completely");
    cache.merge(
        MergeGenerator.source(cacheUpdates, (t, s) => t.key === s.key)
            .presentInBoth().update()
            .presentInSource().insert()
    ).log();
}

function test6() {
    const customers = ObjectArray.createInstance([
        { customerId: 1, name: "Acme Corp", tier: "Gold", creditLimit: 50000 },
        { customerId: 2, name: "Beta Inc", tier: "Silver", creditLimit: 25000 },
        { customerId: 3, name: "Gamma LLC", tier: "Bronze", creditLimit: 10000 }
    ]);
    const customerApplications = ObjectArray.createInstance([
        { customerId: 1, name: "Acme Corp", tier: "Platinum", creditLimit: 100000 },       // Upgrade
        { customerId: 4, name: "Delta Co", tier: "Gold", creditLimit: 45000 },             // New - approved
        { customerId: 5, name: "Epsilon Ltd", tier: "Bronze", creditLimit: 5000 },         // New - below threshold
        { customerId: 6, name: "Zeta Industries", tier: "Silver", creditLimit: 30000 }     // New - approved
    ]);
    showInput(customers, customerApplications);

    console.log("Test 6A: Conditional Insert (Minimum Credit Limit)");
    customers.merge(
        MergeGenerator.source(customerApplications, (t, s) => t.customerId === s.customerId)
            .presentInBoth().update()
            .presentInSource().when(s => s.creditLimit >= 10000).insert()
    ).log();
}

function test5() {
    const salesData = ObjectArray.createInstance([
        { region: "North", product: "Widget", quarter: "Q1", revenue: 100000, units: 500 },
        { region: "North", product: "Gadget", quarter: "Q1", revenue: 150000, units: 300 },
        { region: "South", product: "Widget", quarter: "Q1", revenue: 80000, units: 400 },
        { region: "East", product: "Gizmo", quarter: "Q1", revenue: 120000, units: 600 }
    ]);
    const salesUpdates = ObjectArray.createInstance([
        { region: "North", product: "Widget", quarter: "Q1", revenue: 110000, units: 550 },     // Update
        { region: "North", product: "Gadget", quarter: "Q1", revenue: 150000, units: 300 },     // No change
        { region: "South", product: "Gadget", quarter: "Q1", revenue: 95000, units: 475 },      // New
        { region: "West", product: "Widget", quarter: "Q1", revenue: 105000, units: 525 }       // New region
    ]);
    showInput(salesData, salesUpdates);

    console.log("Test 5A: Multi-Key Match with Computed Column");
    salesData.merge(
        MergeGenerator.source(salesUpdates, (t, s) => t.region === s.region && t.product === s.product && t.quarter === s.quarter)
            .presentInBoth()
            .update("revenue", "revenue").update("units", "units")

            .presentInTarget().delete()

            .presentInSource().insert()
    ).log();
}

function test4() {
    const sessions = ObjectArray.createInstance([
        { userId: 101, sessionId: "s001", active: true, lastSeen: 1705305600000 },
        { userId: 102, sessionId: "s002", active: true, lastSeen: 1705219200000 },
        { userId: 103, sessionId: "s003", active: true, lastSeen: 1705132800000 },
        { userId: 104, sessionId: "s004", active: false, lastSeen: 1705046400000 }
    ]);
    const activeSessions = ObjectArray.createInstance([
        { userId: 101, sessionId: "s001", lastSeen: 1705392000000 },  // Still active
        { userId: 105, sessionId: "s005", lastSeen: 1705392000000 }   // New session
    ]);
    showInput(sessions, activeSessions);

    console.log("Test 4A: Soft Delete Inactive Sessions");
    sessions.merge(
        MergeGenerator.source(activeSessions, (t, s) => t.userId === s.userId)
            .presentInBoth()
            .update("lastSeen", "lastSeen")

            .presentInSource()
            .insert("userId", "userId")
            .insert("sessionId", "sessionId")
            .insert("lastSeen", "lastSeen")
            .insert("active", () => true)

            .presentInTarget().update("active", () => false)
    ).log();
}

function test3() {
    const inventory = ObjectArray.createInstance([
        { sku: "A001", name: "Widget", stock: 100, price: 25.00, discontinued: false },
        { sku: "A002", name: "Gadget", stock: 50, price: 45.00, discontinued: false },
        { sku: "A003", name: "Gizmo", stock: 0, price: 30.00, discontinued: false },
        { sku: "A004", name: "Doohickey", stock: 200, price: 15.00, discontinued: false }
    ]);
    const inventoryUpdates = ObjectArray.createInstance([
        { sku: "A001", name: "Widget", stock: 150, price: 27.00, discontinued: false },    // Stock & price update
        { sku: "A002", name: "Gadget", stock: 30, price: 45.00, discontinued: true },      // Mark discontinued
        { sku: "A003", name: "Gizmo", stock: 0, price: 33.00, discontinued: true },        // Mark discontinued
        { sku: "A005", name: "Thingamajig", stock: 75, price: 20.00, discontinued: false } // New product
    ]);
    showInput(inventory, inventoryUpdates);

    console.log("Test 3A: Delete Discontinued Items");
    inventory.merge(
        MergeGenerator.source(inventoryUpdates, (t, s) => t.sku === s.sku)
            .presentInBoth()
            .when((t, s) => s.discontinued).delete()
            .resetWhenCondition().update()

            .presentInSource().insert()
    ).log();

    console.log("Test 3B: Conditional Update Based on Stock");
    inventory.merge(
        MergeGenerator.source(inventoryUpdates, (t, s) => t.sku === s.sku)
            .presentInBoth()
            .when((t, s) => s.stock > 0).update()
            .when((t, s) => s.stock === 0 && s.discontinued).delete()

            .presentInSource().insert()
    ).log();
}

function test2() {
    const jobRuns = ObjectArray.createInstance([
        { jobName: "ETL-Daily", instance: "2024-01-15", status: "Running", startTime: 1705305600000, endTime: null, duration: null },
        { jobName: "ETL-Daily", instance: "2024-01-14", status: "Success", startTime: 1705219200000, endTime: 1705222800000, duration: 3600000 },
        { jobName: "Report-Gen", instance: "2024-01-15", status: "Pending", startTime: null, endTime: null, duration: null }
    ]);
    const jobUpdates = ObjectArray.createInstance([
        { jobName: "ETL-Daily", instance: "2024-01-15", status: "Success", startTime: 1705305600000, endTime: 1705309200000 },  // Completed
        { jobName: "ETL-Daily", instance: "2024-01-16", status: "Running", startTime: 1705392000000, endTime: null },           // New run
        { jobName: "Report-Gen", instance: "2024-01-15", status: "Failed", startTime: 1705305600000, endTime: 1705306500000 }   // Failed
    ]);
    showInput(jobRuns, jobUpdates);

    console.log("Test 2A: Update Specific Columns");
    jobRuns.merge(
        MergeGenerator.source(jobUpdates, (t, s) => t.jobName === s.jobName && t.instance === s.instance)
            .presentInBoth()
            .update("status", "status")
            .update("startTime", "startTime")
            .update("endTime", "endTime")
            .update("duration", (t, s) => {
                if (s.endTime) {
                    if (t.startTime)
                        return s.endTime - t.startTime;
                    return s.endTime - s.startTime;
                }
                return null;
            })

            .presentInSource()
            .insert("jobName", "jobName")
            .insert("instance", "instance")
            .insert("status", "status")
            .insert("startTime", "startTime")
            .insert("endTime", "endTime")

    ).log();
}

function test1() {
    const employees = ObjectArray.createInstance([
        { id: 1, name: "Alice", dept: "Engineering", salary: 90000, status: "Active" },
        { id: 2, name: "Bob", dept: "Sales", salary: 75000, status: "Active" },
        { id: 3, name: "Charlie", dept: "HR", salary: 65000, status: "Active" },
        { id: 4, name: "Diana", dept: "Engineering", salary: 95000, status: "Active" }
    ]);
    const employeeUpdates = ObjectArray.createInstance([
        { id: 1, name: "Alice", dept: "Engineering", salary: 95000, status: "Active" },  // Update salary
        { id: 2, name: "Bob", dept: "Marketing", salary: 80000, status: "Active" },      // Update dept & salary
        { id: 5, name: "Eve", dept: "Sales", salary: 70000, status: "Active" },          // New employee
        { id: 6, name: "Frank", dept: "Engineering", salary: 92000, status: "Active" }   // New employee
    ]);
    // Note: Charlie (id:3) and Diana (id:4) missing from source
    showInput(employees, employeeUpdates);

    console.log("Test 1A: Full Sync (Update All, Insert New, Delete Orphaned)");
    employees.merge(
        MergeGenerator.source(employeeUpdates, (t, s) => t.id === s.id)
            .presentInSource().insert()
            .presentInTarget().delete()
            .presentInBoth().update()
    ).log();

    console.log("Test 1B: Update Only (No Insert/Delete)");
    employees.merge(
        MergeGenerator.source(employeeUpdates, (t, s) => t.id === s.id)
            .presentInBoth().update()
    ).log();

    console.log("Test 1C: Insert Only New Records");
    employees.merge(
        MergeGenerator.source(employeeUpdates, (t, s) => t.id === s.id)
            .presentInSource().insert()
    ).log();
}

function showInput(target, source) {
    target.log(0, "Before");
    source.log(0, "Changes");
    console.log("\n\n---------------------- outputs below ----------------------------\n\n");
}
