import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/ObjectArray.js";

export async function main() {
    const employeePath = "./tests/new/resource/join-test-data/employees.json";
    const ordersPath = "./tests/new/resource/join-test-data/orders.json";
    const productPath = "./tests/new/resource/join-test-data/product.json";

    const employeeData = await readJSON(employeePath);
    const ordersData = await readJSON(ordersPath);
    const productData = await readJSON(productPath);

    const startTimer = performance.now();

    // let employee = ObjectArray.createInstance(employeeData);
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

    // orders
    //     .innerJoin(product, (a, b) => a.productid === b.productid)
    //     .log(0, "Inner join");

    // orders
    //     .leftJoin(product, (a, b) => a.productid === b.productid)
    //     .log(0, "Left join");

    // orders
    //     .rightJoin(product, (a, b) => a.productid === b.productid)
    //     .log(0, "Right join");

    // orders.unionAll(product)
    //     .log();

    orders
        .leftAntiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Left Anti join");

    orders
        .rightAntiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Right Anti join");

    orders
        .fullAntiJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Full Anti join");

    orders
        .fullJoin(product, (a, b) => a.productid === b.productid)
        .log(0, "Full join");

    // anti joins returns the rows which have no match in other table
    // not horizontally merged tables with other table as null values
    // opposite for semi joins, returns rows which have match in other table


    // orders
    //     .crossJoin(product)
    //     .log(0, "Cross join");

    // console.log(orders);
    // console.log(product);
    // console.log(result);

    // SELF JOIN EXMAPLE
    // const employee = ObjectArray.createInstance(employeeData)
    //     .updateColumn("empid", item => Number(item.empid))
    //     .updateColumn("managerid", item => item.managerid === "" ? null : Number(item.managerid));
    // const emp2 = employee.execute();

    // employee.log(0, "Employee data");
    // employee.leftJoin(emp2, (a, b) => a.managerid === b.empid)
    //     .rename("LEFT.empid", "empid")
    //     .rename("LEFT.name", "name")
    //     .rename("LEFT.role", "role")
    //     .rename("LEFT.managerid", "managerid")
    //     .rename("RIGHT.name", "manager_name")
    //     .drop("RIGHT.empid", "RIGHT.role", "RIGHT.managerid")
    //     .log();

    const endTimer = performance.now();
    console.log(`${endTimer - startTimer} ms`);
}
