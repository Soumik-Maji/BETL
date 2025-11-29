import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { readJSON } from "./json-reader.js";

export async function main() {
    const path = "./tests/new/resource/test-data/explode-test.data.json";
    const data = await readJSON(path);
    const expData = ObjectArray.createInstance(data);

    console.log("Explode test");
    const start = performance.now();

    expData
        .log(0, "Before operations")
        .updateColumn("books", item => item.books.split("|"))
        .explode("books")
        .log(0, "After operations");

    const end = performance.now();
    console.log(`${end - start} ms`);
}
