import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../scripts/ObjectArray.js";
import { DeduplicateGenerator } from "../../scripts/util/manipulator-functions/deduplicate.js";

export async function main() {
    const detailsData = await readJSON("./tests/resource/test-data/fake-details.json");

    const start = performance.now();

    let details = ObjectArray.createInstance(detailsData);

    details
        .rename("Serial Number", "slno")
        .rename("Job Name", "name")
        .rename("Frequency", "fq")
        .rename("Status", "status")
        .rename("Start Time", "start")
        .rename("End Time", "end")
        .updateColumn("slno", item => item.status === "failed" ? null : item.slno)
        .log()
        .deduplicate(
            DeduplicateGenerator.setDeduplicatingColumns("status", "fq")
                // .max("StartTime")
                // .last()
                .setResolveFunction(item => {
                    let maxSlnoObj = item[0];
                    for (const elm of item) {
                        if (elm.slno === undefined || elm.slno === null)
                            continue;
                        else
                            maxSlnoObj = maxSlnoObj.name !== undefined && maxSlnoObj.name > elm.name ? maxSlnoObj : elm;
                    }
                    return maxSlnoObj;
                })

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
            // .setResolveFunction(arr => detailsData[0])  // Reference from different array
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
        // .updateColumn("StartTime", item => new Date(item.StartTime).toISOString().slice(11, 19))
        // .updateColumn("EndTime", item => new Date(item.EndTime).toISOString().slice(11, 19))
        // .updateColumn("Duration", item => new Date(item.Duration).toISOString().slice(11, 19))
        // .updateColumn("slno", item => Number(item.slno))
        .log();

    const end = performance.now();
    console.log(`${end - start} ms`);

}

// TODO: OPTIMIZE THE DEDUPLICATE FUNCTION FOR SAVING MEMORY & TIME
