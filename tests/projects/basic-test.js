import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { SortGenerator } from "../../../scripts/util/manipulator-functions/sorting.js";

export async function main() {
    const path = "./tests/resource/join-test-data/employees.json";
    const jsonData = await readJSON(path);

    const oa = ObjectArray.createInstance(jsonData);
    oa.log(0, "Original");

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

        .filter(item => item.role === "BACKEND")

        .sort(
            SortGenerator
                .asc("role")
                .desc("euid", item => item.substring(item.length - 1))
        )

        .select("id", "euid", "mid")
        .drop("mid")
        .take(2, 1)
        ;

    newOA.log(0, "After changes");

}
