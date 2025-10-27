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
        .updateColumn("quantity", item => Number(item.quantity));

    product = product
        .rename("product id", "productid")
        .updateColumn("price", item => Number(item.price));

    const result = orders
        .innerJoin(product, (a, b) => a.productid === b.productid)
        .log();

    // console.log(orders.columns);
    // console.log(product.columns);
    // console.log(result.columns);
    // console.log(result);

    const endTimer = performance.now();
    console.log(`${endTimer - startTimer} ms`);
}
