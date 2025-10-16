import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/jsoar/ObjectArray.js";
import { SortLogicGenerator } from "../../../scripts/generators/SortLogicGenerator.js";

export async function main() {
    const path = "./tests/new/resource/join-test-data/employees.json";
    const jsonData = await readJSON(path);

    const oa = ObjectArray.createInstance(jsonData);
    oa.show();

    oa.sort(SortLogicGenerator.createInstance().asc("role", col => col.toLowerCase())).show();

    oa.show();
}
