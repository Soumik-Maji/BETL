import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { AppendGenerator } from "../../../scripts/util/manipulator-functions/appending.js";
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
        .updateColumn("StartTime", item => time24to12(item.StartTime))
        .updateColumn("EndTime", item => time24to12(item.EndTime))
        .take(10);

    // details.log(0, "details");
    // runs.log(0, "runs");

    details
        .append(AppendGenerator.setSource(runs)
            .set("JobName", "Instance")
            .set("Status", "Status")
            .set("StartTime", "StartTime")
            .set("EndTime", "EndTime")
        )
        .log(0, "result");

    const end = performance.now();
    console.log(`${end - start} ms`);

}

function time24to12(time) {
    let [h, m] = time.split(":").map(i => Number(i));
    let ampm = "AM";
    if (h > 11)
        ampm = "PM";
    if (h > 12)
        h -= 12;
    return `${h}:${m} ${ampm}`;
}
