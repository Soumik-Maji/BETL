import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { SortLogicGenerator } from "../../../scripts/util/manipulator-functions/sorting.js";

export async function main() {
    const path = "./tests/new/resource/join-test-data/employees.json";
    const jsonData = await readJSON(path);

    // let jsonData = [
    //     {
    //         "empid": "1",
    //         "name": "Sally",
    //         "role": "backend",
    //         "managerid": ""
    //     },
    //     {
    //         "empid": "2",
    //         "name": "Josh",
    //         "role": "frontend",
    //         "managerid": "1"
    //     },
    //     {
    //         "empid": "3",
    //         "name": "Becky",
    //         "role": "database",
    //         "managerid": "5"
    //     },
    //     {
    //         "empid": "4",
    //         "name": "Bob",
    //         "role": "backend",
    //         "managerid": "1"
    //     },
    //     {
    //         "empid": "5",
    //         "name": "Eric",
    //         "role": "database",
    //         "managerid": "1"
    //     },
    //     {
    //         "empid": "6",
    //         "name": "Rose",
    //         "role": "backend",
    //         "managerid": "4"
    //     }
    // ];

    const oa = ObjectArray.createInstance(jsonData);
    // debug(oa);

    const startTimer = performance.now();

    let newOA = oa
        .rename("empid", "id")
        .rename("managerid", "mid")

        .updateColumn("id", item => Number(item.id))
        .updateColumn("mid", item => item.mid === "" ? null : Number(item.mid))
        .updateColumn("role", item => item.role.toUpperCase())

        .addColumn("euid", item => {
            let newid = `${item.name.substring(0, 2)}${item.role.substring(0, 2)}-${item.id}.`;
            newid += item.mid === null ? "T" : item.mid;
            return newid;
        })

        // .filter(item => item.role === "BACKEND")
        // .select("id", "euid", "mid")
        // .drop("mid")
        // .take(2, 1)

        .sort(
            SortLogicGenerator.createInstance()
                .asc("role")
                .desc("name")
        )
        ;

    debug("Original", oa);

    debug("After operations added", newOA);

    const endTimer = performance.now();
    console.log(`${endTimer - startTimer} ms`);
}

function debug(msg, oa) {
    console.log(msg);
    console.log("columns-> ", oa.columns);
    // console.log("logic plan-> ", oa.logicPlan);
    // console.table(oa.data);
    oa.log();
    console.log("------------------------- LINE GAP -------------------------");
}
