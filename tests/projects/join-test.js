import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../scripts/ObjectArray.js";

export async function main() {
    const employeePath = "./tests/resource/join-test-data/employees.json";
    const ordersPath = "./tests/resource/join-test-data/orders.json";
    const productPath = "./tests/resource/join-test-data/product.json";

    const employeeData = await readJSON(employeePath);
    const ordersData = await readJSON(ordersPath);
    const productData = await readJSON(productPath);

    const startTimer = performance.now();

    let employee = ObjectArray.createInstance(employeeData);
    let orders = ObjectArray.createInstance(ordersData);
    let product = ObjectArray.createInstance(productData);

    orders = orders
        .updateColumn("orderid", item => Number(item.orderid))
        .updateColumn("quantity", item => Number(item.quantity))
        // .filter(item => item.quantity === 0)
        ;

    product = product
        .rename("product id", "productid")
        .updateColumn("price", item => Number(item.price))
        // .filter(item => item.price === 0)
        ;

    // NORMAL JOINS
    orders.innerJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Inner join");

    orders.leftJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Left join");

    orders.rightJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Right join");

    // ANTI JOINS
    orders.leftAntiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Left Anti join");

    orders.rightAntiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Right Anti join");

    // SEMI JOINS
    orders.leftSemiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Left Semi join");

    orders.rightSemiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Right Semi join");

    // FULL JOINS: A COMPOSITE JOIN OF SIMPLER JOINS
    orders
        .fullAntiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Full Anti join");

    orders
        .fullJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Full join");

    // VERTICAL MERGING
    orders.unionAll(orders)
        // .unionAll(product)   // throws error due to column names not matching
        .log(0, "Union All");

    // SPECIAL CASES
    orders.crossJoin(product)
        .log(0, "Cross join");

    // self join exmaple
    employee = employee
        .updateColumn("empid", item => Number(item.empid))
        .updateColumn("managerid", item => item.managerid === "" ? null : Number(item.managerid));
    const emp2 = employee.execute();

    employee.log(0, "Employee data");
    const t = employee.leftJoin(emp2, (a, b) => a.managerid === b.empid)
        .renameRegex("LEFT.*", "$0")
        .rename("RIGHT.name", "manager_name")
        .dropRegex("RIGHT.*")
        .drop("managerid")
        // .selectRegex("RIGHT.*")
        .updateColumn("empid", item => item.empid.toString().padStart(3, "0"))
        .log(0, "self join on employee data");

    const endTimer = performance.now();
    console.log(`${endTimer - startTimer} ms`);
}
