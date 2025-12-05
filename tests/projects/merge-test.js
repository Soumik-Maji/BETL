import { ObjectArray } from "../../scripts/ObjectArray.js";
import { MergeGenerator } from "../../scripts/util/manipulator-functions/merge.js";

export async function main() {
    test1A();
}

function test1A() {
    console.log("Test 1A: Full Sync (Update All, Insert New, Delete Orphaned)");

    const employees = [
        { id: 1, name: "Alice", dept: "Engineering", salary: 90000, status: "Active" },
        { id: 2, name: "Bob", dept: "Sales", salary: 75000, status: "Active" },
        { id: 3, name: "Charlie", dept: "HR", salary: 65000, status: "Active" },
        { id: 4, name: "Diana", dept: "Engineering", salary: 95000, status: "Active" }
    ];
    const employeeUpdates = [
        { mid: 1, name: "Alice", dept: "Engineering", salary: 95000, status: "Active" },  // Update salary
        { mid: 2, name: "Bob", dept: "Marketing", salary: 80000, status: "Active" },      // Update dept & salary
        { mid: 5, name: "Eve", dept: "Sales", salary: 70000, status: "Active" },          // New employee
        { mid: 6, name: "Frank", dept: "Engineering", salary: 92000, status: "Active" }   // New employee
    ];
    // Note: Charlie (id:3) and Diana (id:4) missing from source

    const emp = ObjectArray.createInstance(employees);
    const empUpdate = ObjectArray.createInstance(employeeUpdates).rename("mid", "id");

    emp.log(0, "Before");
    empUpdate.log(0, "Changes");

    emp.merge(
        MergeGenerator.source(empUpdate, (t, s) => t.id === s.id)
            .presentInSource().insert()
            // .presentInTarget().delete()
            .presentInBoth().update()
    )
        .log(0, "After");
}
