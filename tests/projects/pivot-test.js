import { ObjectArray } from "../../scripts/ObjectArray.js";
import { GroupByGenerator } from "../../scripts/util/manipulator-functions/grouping.js";
import { PivotGenerator } from "../../scripts/util/manipulator-functions/pivoting.js";

export async function main() {
    const start = performance.now();

    // const res = test1();
    // const res = test2();
    // const res = test3();
    const res = test4();

    console.log("FINAL CHECK");
    console.log(res.data);
    console.log(res.columns);

    console.log(`${performance.now() - start} ms`);
}

function test4() {
    const salesData = [
        { "store": "Store_A", "month": "Jan", "product": "Laptop", "sales": 5000, "quantity": 5 },
        { "store": "Store_A", "month": "Jan", "product": "Laptop", "sales": 3000, "quantity": 3 }, // Duplicate - same store, month, product
        { "store": "Store_A", "month": "Jan", "product": "Phone", "sales": 2000, "quantity": 10 },
        { "store": "Store_A", "month": "Feb", "product": "Laptop", "sales": 4000, "quantity": 4 },
        { "store": "Store_A", "month": "Feb", "product": "Phone", "sales": 2500, "quantity": 12 },
        { "store": "Store_B", "month": "Jan", "product": "Laptop", "sales": 6000, "quantity": 6 },
        { "store": "Store_B", "month": "Jan", "product": "Phone", "sales": 1800, "quantity": 9 },
        { "store": "Store_B", "month": "Jan", "product": "Phone", "sales": 1200, "quantity": 6 }, // Duplicate - same store, month, product
        { "store": "Store_B", "month": "Feb", "product": "Laptop", "sales": 5500, "quantity": 5 },
        { "store": "Store_B", "month": "Feb", "product": "Phone", "sales": 2200, "quantity": 11 },
        { "store": "Store_C", "month": "Jan", "product": "Laptop", "sales": 4500, "quantity": 4 },
        { "store": "Store_C", "month": "Jan", "product": "Laptop", "sales": 1500, "quantity": 1 }, // Duplicate - same store, month, product
        { "store": "Store_C", "month": "Feb", "product": "Laptop", "sales": 7000, "quantity": 7 },
        { "store": "Store_C", "month": "Feb", "product": "Phone", "sales": 1900, "quantity": 8 }
    ];
    return ObjectArray.createInstance(salesData)
        // .log(0, "Original")
        .groupBy(GroupByGenerator
            .setGroupingColumns("store", "month", "product")
            .sum("sales")
            .sum("quantity")
        )
        .renameRegex("sum_*", "$0")
        // .log(0, "Aggregated")
        .pivot(PivotGenerator
            .pivotOn("product")
            .values("sales", "quantity")
        )
        .log(0, "Pivoted")
        ;
}

function test1() {
    const data = [
        { "region": "North", "quater": "Q1", "channel": "Online", "revenue": 100, "units": 10 },
        { "region": "North", "quater": "Q1", "channel": "Retail", "revenue": 80, "units": 8 },
        { "region": "North", "quater": "Q2", "channel": "Online", "revenue": 150, "units": 15 },
        { "region": "North", "quater": "Q2", "channel": "Retail", "revenue": 120, "units": null }
    ];
    return ObjectArray.createInstance(data)
        .log(0, "Original")
        .pivot(PivotGenerator
            .pivotOn("quater")
            .values("revenue", "units")
        )
        .log(0, "pivot-1")
        .pivot(PivotGenerator
            .pivotOn("channel")
            .values("Q1_revenue", "Q1_units", "Q2_revenue", "Q2_units")
        )
        .log(0, "pivot-2")
        ;
}

function test2() {
    const data = [
        { region: 'North', quater: 'Q1', revenue: 100 },
        { region: 'South', quater: 'Q2', revenue: 150 }
    ];
    return ObjectArray.createInstance(data)
        .log(0, "Original")
        .pivot(PivotGenerator
            .pivotOn("quater")
            .values("revenue")
        )
        .log(0, "pivot-1")
        ;
}

function test3() {
    return ObjectArray.createEmptyInstance("region", "quater", "revenue")
        .log(0, "Original")
        .pivot(PivotGenerator
            .pivotOn("quater")
            .values("revenue")
        )
        .log(0, "pivot-1")
        ;
}
