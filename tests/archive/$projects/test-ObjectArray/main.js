import { DeduplicateGenerator } from "../../scripts/generators/DeduplicateGenerator.js";
import { GroupingGenerator } from "../../scripts/generators/GroupingGenerator.js";
import { MappingGenerator } from "../../scripts/generators/MappingGenerator.js";
import { RenameMapGenerator } from "../../scripts/generators/RenameMapGenerator.js";
import { SortLogicGenerator } from "../../scripts/generators/SortLogicGenerator.js";
import { ObjectArray } from "../../scripts/jsoar/ObjectArray.js";
import { CSV2JSON } from "../../scripts/parsers/csv/CSV2JSON.js";
import { XLSX2JSON } from "../../scripts/parsers/xlsx/XLSX2JSON.js";
import { HTMLInput } from "../../scripts/inputs/HTMLInput.js";
import { WindowingGenerator } from "../../scripts/generators/WindowingGenerator.js";

// async function main() {

//     let details = resourceFinder("test-data/fake-details-SHORT.csv");
//     details = await CSV2JSON.readFile(details);
//     details = details.setColumnSeparator("|").load();
//     let dtlsOA = ObjectArray.createInstance(details.data);

//     dtlsOA = dtlsOA
//         .renameMany(
//             RenameMapGenerator.createInstance()
//                 .rename("serial number", "slno")
//                 .rename("job name", "name").rename("frequency", "fq")
//                 .rename("start time", "start").rename("end time", "end")
//         )
//         .updateColumn("slno", item => item.slno === "" ? undefined : Number(item.slno))
//         .updateColumn("name", item => item.name === "" ? null : item.name)

//     // dtlsOA
//     // .sort(SortLogicGenerator.createInstance().asc("status").asc("slno"))
//     // .select("slno", "name", "status", "fq")
//     // .showHTML("OG");

//     // dtlsOA.deduplicate(
//     //     DeduplicateGenerator.setDeduplicatingColumns("status")
//     //         // .setResolveFunction(item => {
//     //         //     let maxSlnoObj = {};
//     //         //     for (const elm of item) {
//     //         //         if (elm.slno === undefined || elm.slno === null)
//     //         //             continue;
//     //         //         else
//     //         //             maxSlnoObj = maxSlnoObj.name !== undefined && maxSlnoObj.name > elm.name ? maxSlnoObj : elm;
//     //         //     }
//     //         //     return maxSlnoObj;
//     //         // })

//     //         // .last()
//     //         .max("slno")
//     //     // .min("slno")
//     // )
//     //     .showHTML("deduplicated");


//     // dtlsOA
//     //     .groupBy(
//     //         // REFACTORED FOR STRING, DATE, NUMBER SUPPORT. CHECK WITH BHAI OR AI
//     //         // IMPLEMENT MAX & MIN IN A SIMILAR WAY AS PRE-DEFINED RESOLVE FUNCTIONS FOR DEDUPLICATOR
//     //         GroupingGenerator.setGroupingColumns("status")
//     //             .count()
//     //             // refactored code for .count() - CHECK IT WITH AI
//     //             // 1: undefined, null, "" column names will lead to ignoring column name. alias can be provided, defualt is "count_all"
//     //             // 2: any other column name will be validated. alias can be provided, default is `count_{columnName}`
//     //             .sum("slno")
//     //             .avg("slno", "avgSlno")

//     //             // FOR THIS CHECK FOR TYPE. TYPE PRECEDENCE NUMBER < DATE < STRING
//     //             // IMPLEMENT THEM
//     //             .max("slno")
//     //             .max("name")
//     //             .min("slno")
//     //             .min("name")

//     //             .customAggregator("slno", "rms",
//     //                 arr => Math.sqrt(
//     //                     arr
//     //                         .filter(elm => elm !== undefined && elm !== null)
//     //                         .reduce((acc, elm) => acc + (elm * elm), 0)
//     //                     / arr.length
//     //                 )
//     //             )
//     //     )
//     //     .showHTML("Grouping");
// }

// async function main() {

//     // CHECKING FOR JOINS
//     let rawData = await CSV2JSON.readFile(resourceFinder("join-test-data/orders.csv"))
//     rawData = rawData.load();
//     const orders = ObjectArray.createInstance(rawData.data);

//     rawData = await CSV2JSON.readFile(resourceFinder("join-test-data/product.csv"))
//     rawData = rawData.load();
//     const products = ObjectArray.createInstance(rawData.data);

//     // orders.showHTML("orders");
//     // products.showHTML("products");

//     orders.show();
//     products.show();

//     orders
//         .rightJoin(products, (a, b) => a["productid"] === b["product id"])
//         .showHTML("join result")

//     // CHECKING UNIONALL()
//     // const rawData = await XLSX2JSON.readFile(xlsxFile);
//     // const shortXlsx = await rawData.setSheetName("Sheet1").load();
//     // const shortData = ObjectArray.createInstance(shortXlsx)
//     //     .updateColumn("Serial Number", item => "SHORT-" + item["Serial Number"]);
//     // shortData.showHTML("short");

//     // const fullXlsx = await rawData.setSheetName("Sheet2").load();
//     // const fullData = ObjectArray.createInstance(fullXlsx)
//     //     .updateColumn("Serial Number", item => "FULL-" + item["Serial Number"]);
//     // fullData.showHTML("full");

//     // shortData.unionAll(fullData).showHTML("UNION DATA");
//     // const result = shortData.unionAll(fullData).show();

// }

// async function main() {
//     // SELF JOIN IMPLEMENTATION
//     let data = await CSV2JSON.readFile(resourceFinder("join-test-data/employees.csv"));
//     data = data.load();
//     const emps = ObjectArray.createInstance(data.data);

//     const rightTable = emps
//         .select("empid", "name")
//         .renameMany(RenameMapGenerator.createInstance()
//             .rename("empid", "manager_empid")
//             .rename("name", "manager_name")
//         );

//     emps.showHTML("Original Employees");
//     // rightTable.show();

//     emps
//         .leftJoin(rightTable, (a, b) => a.managerid === b.manager_empid)
//         .select("empid", "name", "role", "manager_name")
//         .rename("manager_name", "manager")
//         .updateColumn("manager", item => item.manager ?? "NONE")
//         .showHTML("Manager Names Table");

// }

async function main() {
    // CHECKING WINDOW FUNCTIONS
    // let data = resourceFinder("window-test-data/testing-window-LONG.csv");
    let data = resourceFinder("window-test-data/testing-window-DUP_SAL.csv");
    data = await CSV2JSON.readFile(data);
    data = data.load();

    const emps = ObjectArray.createInstance(data.data);
    // emps.showHTML("original data");
    // console.log("original"); emps.show();

    // emps
    //     .sort(SortLogicGenerator.createInstance().asc("dept").asc("team"))
    //     .showHTML("og");

    emps
        .updateColumn("salary", item => (item.salary === "") ? undefined : Number(item.salary))
        // .updateColumn("salary", item => Number(item.salary)).show()
        .window(
            WindowingGenerator.createInstance()
                .partitionBy("team")
                .orderBy(SortLogicGenerator.createInstance().desc("salary", item => Number(item)))

                // .rowNumber("row")
                // .rank()
                // .denseRank("d_rnk")
                // .ntile(3)

                // .sum("salary", "", 1, 1)
                // .count("salary", "", 1, 1)
                // .avg("salary", "", 1, 1)

                // .max("name", "", 1, 1)
                // .min("name", "", 1, 1)
                // .max("salary", "", 1, 1)
                // .min("salary", "", 1, 1)

                // .nthValue("salary", 3, "", 1, 1)
                // .firstValue("salary", "", 1, 1)
                // .lastValue("salary", "", 1, 1)

                .lead("salary", 1, "", 0)
                .lag("salary", 1, "", 0)

            // TODO: ALL COMMONLY USED WINDOWING FUNCTIONS ARE WRITTEN. CHECK THEM AGAIN.
            // REFACTOR: THERE ARE A LOT OF REPEATATIVE CODE IN WindowingGenerator, SOME ARE REPEATED IN GroupingGenerator AS WELL.
            //           LOOK FOR A WAY TO STOP THIS REPEATATION.

            // .customWindowFunction("rms", arr => {
            //     const startOffset = 1, endOffset = 1;
            //     for (let i = 0; i < arr.length; i++) {
            //         const copiedArr = WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset)
            //             .filter(item => item.salary !== undefined);
            //         const rms = Math.sqrt(copiedArr.reduce((acc, { salary }) => acc + salary * salary, 0) / copiedArr.length).toFixed(2);
            //         arr[i]["rms"] = rms;
            //     }
            // })
            // .customWindowFunction("rank", arr => {
            //     let r = 1;
            //     arr.forEach(elm => {
            //         elm.rank = r++;
            //     });
            // })
        )
        // .sort(SortLogicGenerator.createInstance().asc("dept").asc("team"))
        // .updateColumn("avg_salary", item => item.avg_salary.toFixed(2))
        .showHTML("Window Testing")
    // .filter(item => item.salary >= item.deptTeamTotalSalary)
    // .showHTML("greater than or equal to average")

    // TODO: CONTINUE FROM MAKING WINDOW FUNCTION ACT PROPERLY [ObjectArray:656]

}
function resourceFinder(path) { return `../../resource/${path}`; }

// const xlsxFile = HTMLInput.createFileInput("sh");
// document.getElementById("btn").addEventListener("click", async () => { })
const start = performance.now();
await main();
const end = performance.now();
console.log((end - start).toFixed(2), "ms");
