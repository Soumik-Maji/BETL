import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { DeduplicateGenerator } from "../../../scripts/util/manipulator-functions/deduplicate.js";

export async function main() {
    const runsData = await readJSON("./tests/new/resource/test-data/fake-runs.json");

    const start = performance.now();

    let runs = ObjectArray.createInstance(runsData);

    runs
        .renameRegex("* *", "$0$1")
        .updateColumn("StartTime", item => new Date("2000-01-01T" + item.StartTime).getTime())
        .updateColumn("EndTime", item => {
            const endTime = new Date("2000-01-01T" + item.EndTime).getTime();
            return endTime < item.StartTime ? endTime + 86400000 : endTime;
        })
        .addColumn("Duration", item => item.EndTime - item.StartTime)
        .deduplicate(
            DeduplicateGenerator.setDeduplicatingColumns("Status")
                // .max("StartTime")
                .last()

            // EDGE CASE TESTING FOR RESOLVE FUNCTION
            // .setResolveFunction(arr => arr.slice(0, 3))
            // .setResolveFunction(arr => 42)
            // .setResolveFunction(arr => "first")
            // .setResolveFunction(arr => true)
            // .setResolveFunction(arr => null)
            // .setResolveFunction(arr => undefined)
            // .setResolveFunction(arr => arr[100])  // Out of bounds
            // .setResolveFunction(arr => ({ ...arr[0] }))
            // .setResolveFunction(arr => Object.assign({}, arr[0]))
            // .setResolveFunction(arr => JSON.parse(JSON.stringify(arr[0])))
            // .setResolveFunction(arr => {
            //     const item = arr[0];
            //     item.modified = true;  // Mutates but still returns original reference
            //     return item;
            // })
            // .setResolveFunction(arr => ({ userId: 999, name: 'Fake' }))
            // .setResolveFunction(arr => runsData[0])  // Reference from different array
            // .setResolveFunction(arr => {
            //     throw new Error("Custom error");
            // })
            // .setResolveFunction(arr => arr[0].undefinedProperty.deepAccess)
            // .setResolveFunction(arr => ({}))
            // .setResolveFunction(arr => arr[0].nonExistent?.nested?.value ?? arr[0])
            // .setResolveFunction(arr => {
            //     arr.push({ "Status": "row", "StartTime": 1 });  // Try to modify during validation
            //     return arr[0];
            // })
        )
        .updateColumn("StartTime", item => new Date(item.StartTime).toISOString().slice(11, 19))
        .updateColumn("EndTime", item => new Date(item.EndTime).toISOString().slice(11, 19))
        .updateColumn("Duration", item => new Date(item.Duration).toISOString().slice(11, 19))
        .log();

    // let dedupGen = DeduplicateGenerator.setDeduplicatingColumns("c1", "c2", "c3")
    //     .setResolveFunction((arr) => { arr[3] ?? arr[0] });

    // dedupGen = dedupGen.build();
    // console.log(dedupGen);

    const end = performance.now();
    console.log(`${end - start} ms`);

}

// TODO: OPTIMIZE THE DEDUPLICATE FUNCTION FOR SAVING MEMORY & TIME
