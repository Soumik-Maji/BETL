import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/ObjectArray.js";

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
        .log()
        .rename("empid", "id").rename("managerid", "mid")
        // .filter(item => { return item.role === "database" })
        .updateColumn("id", item => Number(item.id))
        .updateColumn("mid", item => item.mid === "" ? null : Number(item.mid))
        .updateColumn("role", item => item.role.toUpperCase())
        .addColumn("username", item => {
            let usn = `${item.name.substring(0, 2).toUpperCase()}-${item.id}.`;
            usn += item.mid === null ? "T" : item.mid;
            return usn;
        })
        .rename("username", "uid")
        .log()
        // .select("uid", "name", "role")
        .drop("id", "role")
        .take(2)
        .log();

    console.log(newOA.columns);

    console.log(newOA.logicPlan);
    newOA = newOA.execute();
    // console.log(newOA.logicPlan);

    // debug(newOA);

    const endTimer = performance.now();
    console.log(`${endTimer - startTimer} ms`);
}

function debug(oa) {
    console.log("This is for debugging");
    console.log(oa);
}
