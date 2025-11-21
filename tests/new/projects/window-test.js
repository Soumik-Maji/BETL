import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { SortLogicGenerator } from "../../../scripts/util/manipulator-functions/sorting.js";
import { WindowFrame, WindowingGenerator } from "../../../scripts/util/manipulator-functions/window.js";
import { readJSON } from "../projects/json-reader.js";

export async function main() {
    const pn = "./tests/new/resource/window-test-data/testing-window.json";
    const pd = "./tests/new/resource/window-test-data/testing-window-DUP_SAL.json";
    const pl = "./tests/new/resource/window-test-data/testing-window-LONG.json";

    const wiNor = ObjectArray.createInstance(await readJSON(pn));
    const wiDup = ObjectArray.createInstance(await readJSON(pd));
    const wiLng = ObjectArray.createInstance(await readJSON(pl));

    const start = performance.now();

    // wiNor.log();
    // wiLng.log();

    const result = wiDup
        .updateColumn("salary", item => item.salary === "" ? null : Number(item.salary))
        .updateColumn("salary", item => item.team === "A" && item.dept === "HR" ? null : item.salary)
        // .log(0, "Original")
        .window(WindowingGenerator
            .partitionBy("team")
            .orderBy(SortLogicGenerator.asc("salary"))

            .rowNumber()
            .rank()
            .denseRank()
            .ntile(4)

            .lead("salary", 2)
            .lag("salary")

            .customNonFrameFunction("c_row", arr => {
                let r = 5;
                arr.forEach(item => {
                    // item.shady_prop = -99;  // not good as not alias. solved.
                    // item.team = "dope";     // already blocked by modify proxy
                    item.c_row = r--;
                })
            })

            .firstValue("salary")
            .lastValue("salary")
            .nthValue("salary", 20)

            .collectList("salary", "all_sal")
            .count()
            .count("salary")
            .sum("salary")
            .avg("salary")
            .max("salary")
            .min("salary", "PTNmin", WindowFrame.rows(-1, 1))

            .customFrameFunction("salary", "rms",
                arr => {
                    const result = arr.reduce((acc, elm) => acc + elm * elm, 0);
                    return Math.sqrt(result / arr.length);
                },
                WindowFrame.rows(-1, 1)
            )
        )
        .log(0, "Output");

    console.log(result.columns);

    const end = performance.now();
    console.log(`${end - start} ms`);
}
