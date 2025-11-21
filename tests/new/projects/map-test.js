import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { MapGenerator } from "../../../scripts/util/manipulator-functions/mapping.js";
import { readJSON } from "./json-reader.js";

export async function main() {
    const detailsData = await readJSON("./tests/new/resource/test-data/fake-details.json");
    const runsData = await readJSON("./tests/new/resource/test-data/fake-runs.json");

    const start = performance.now();

    const details = ObjectArray.createInstance(detailsData)
        .renameRegex("* *", "$0$1")
        .take(5);
    const runs = ObjectArray.createInstance(runsData)
        .renameRegex("* *", "$0$1")
        .take(10);

    // details.log(0, "details");
    // runs.log(0, "runs");

    const result = details.map(
        MapGenerator.setSource(runs)
            .relate("JobName", "Instance")
            .relate("Frequency", "Status")
            .relate("Status", "Status")
            .relate("StartTime", "StartTime")
            .relate("EndTime", "EndTime")
    )
        .log(0, "result");

    const end = performance.now();
    console.log(`${end - start} ms`);

}
