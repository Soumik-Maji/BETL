import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/jsoar/ObjectArray.js";

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

    console.log(oa);
    // oa.show();

}
