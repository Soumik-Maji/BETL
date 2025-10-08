import { FileHandler } from "../../scripts/FileHandler.js";
import { GroupingGenerator } from "../../scripts/GroupingGenerator.js";
import { SeparatedStringValues } from "../../scripts/SeparatedStringValues.js";

async function main() {
    const detailsFilePath = "../../resource/test-data/fake-details-SHORT.csv";
    let resource = await FileHandler.readResource(detailsFilePath);
    let ssv = new SeparatedStringValues(resource);
    const details = ssv.convertToObjectArray({ headerPresent: true, columnSeparator: "|", rowSeparator: "\r\n" });
    // details.show(4);

    // const runsFilePath = "../../resource/test-data/fake-runs-SHORT.csv";
    const runsFileElement = document.getElementById("runs");
    resource = await FileHandler.readInput(runsFileElement);
    ssv = new SeparatedStringValues(resource);
    const runs = ssv.convertToObjectArray({ headerPresent: true, rowSeparator: "\r\n" })
        .rename("status", "runstatus")
        .rename("starttime", "runstart")
        .rename("endtime", "runend");
    // runs.show(4);

    const joinedGrouped = details
        .leftJoin(runs, (a, b) => a.jobname === b.instance)
        .groupBy(
            GroupingGenerator.setGroupingColumns("jobname", "runstatus")
                .count()
        )
        .updateColumn("count", item => item.runstatus === null ? 0 : item.count)
    // .show();

    const joinedGroupedTotals = joinedGrouped
        .groupBy(
            GroupingGenerator.setGroupingColumns("jobname").sum("count")
        )
    // .show();

    const joinedGroupedSuccessCount = joinedGrouped
        .filter(item => item.runstatus === "success")
    // .show();

    joinedGroupedSuccessCount
        .rightJoin(joinedGroupedTotals, (a, b) => a.jobname === b.jobname)
        .updateColumn("count", item => item.runstatus === null ? 0 : item.count)
        .addColumn("status", item => {
            if (item.sum_count === 0)
                return "not started";
            const successRate = item.count / item.sum_count;
            if (successRate === 1)
                return "success";
            else if (successRate === 0)
                return "failed";
            else
                return `${item.count}/${item.sum_count}`
        })
        .select("jobname", "status")
        .show();
}

document.getElementById("calc").addEventListener("click", async () => {
    const ts = performance.now();
    await main()
    const te = performance.now();
    console.log(`Time taken = ${te - ts} ms`);
});
