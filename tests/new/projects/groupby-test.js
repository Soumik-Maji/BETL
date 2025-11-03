import { readJSON } from "./json-reader.js";
import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { GroupByGenerator } from "../../../scripts/util/manipulator-functions/grouping.js";
import { SortLogicGenerator } from "../../../scripts/util/manipulator-functions/sorting.js";

export async function main() {
    const path = "./tests/new/resource/window-test-data/testing-window.json";
    const pathDup = "./tests/new/resource/window-test-data/testing-window-DUP_SAL.json";
    const pathLong = "./tests/new/resource/window-test-data/testing-window-LONG.json";

    const rawDataL = await readJSON(pathLong);
    const rawDataD = await readJSON(pathDup);

    const start = performance.now();

    let dataL = ObjectArray.createInstance(rawDataL);
    // let dataD = ObjectArray.createInstance(rawDataD);

    // dataL
    //     .innerJoin(dataD, (a, b) => a.name === b.name)
    //     .rename("RIGHT.salary", "dupsal")
    //     .rename("LEFT.salary", "orisal")
    //     .dropRegex("RIGHT.*")
    //     .renameRegex("LEFT.*", "$0")
    //     .sort(SortLogicGenerator.createInstance().asc("team").asc("dept"))
    //     .log();

    dataL = dataL
        .updateColumn("salary", item => Number(item.salary))
        .sort(SortLogicGenerator.createInstance().asc("team").asc("dept"))
        // .rename("dept", "department")
        .log(0, "Before grouping")
        .groupBy(
            GroupByGenerator.setGroupingColumns("team", "dept")
                .count()
                .count("salary")
                .sum("salary", "total_sal")
                .avg("salary")
                .max("salary")
                .min("salary")
                .customAggregator("salary", "rms_sal", arr => {
                    let total = 0;
                    for (let i = 0; i < arr.length; i++) {
                        const elm = Number(arr[i]);
                        total += elm * elm;
                    }
                    return Math.sqrt(total / arr.length);
                })
                .collectList("salary", "unexploded_sal")
                .collectList("name")
                .customAggregator("salary", "joined", arr => arr.join(", "))
        )
        .log(0, "After grouping")
        ;

    console.log(dataL.columns);

    const end = performance.now();
    console.log(`${end - start} ms`);
}
