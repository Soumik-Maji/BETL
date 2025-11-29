import { ObjectArray } from "../../scripts/ObjectArray.js";
import { DeduplicateGenerator } from "../../scripts/util/manipulator-functions/deduplicate.js";
import { GroupByGenerator } from "../../scripts/util/manipulator-functions/grouping.js";
import { AppendGenerator } from "../../scripts/util/manipulator-functions/appending.js";
import { MeltGenerator } from "../../scripts/util/manipulator-functions/melting.js";
import { PivotGenerator } from "../../scripts/util/manipulator-functions/pivoting.js";
import { SortGenerator } from "../../scripts/util/manipulator-functions/sorting.js";
import { WindowFrame, WindowGenerator } from "../../scripts/util/manipulator-functions/window.js";

export async function main() {

    //     console.log("---------------------- SortGenerator ----------------------");
    //     const slg = SortGenerator
    //         .asc("c1")
    //         .desc("c2", item => Number(item))
    //         // .desc("c1", item => new Date(item))
    //         .build();

    //     console.log(slg);

    // console.log("---------------------- MapGenerator ----------------------");
    // const data = [
    //     { "name": "Roxy", "age": 25 },
    //     { "name": "Tom", "age": 12 },
    //     { "name": "Sam", "age": 17 },
    //     { "name": "Joel", "age": 23 }
    // ];

    // const oa = ObjectArray.createInstance(data)
    //     .addColumn("eligible", item => item.age > 18);

    // const mg = AppendGenerator.setSource(oa)
    //     .set("username", "name")
    //     .set("reg_date", "age")
    //     .set("eligible", "eligible")
    //     .build();
    // console.log(JSON.stringify(mg, null, 2));
    // console.log(mg);

    //     console.log("---------------------- DeduplicateGenerator ----------------------");
    //     let dedupGen = DeduplicateGenerator.setDeduplicatingColumns("c1", "c2", "c3")
    //         .setResolveFunction((arr) => { arr[3] ?? arr[0] });

    //     dedupGen = dedupGen.build();
    //     console.log(dedupGen);

    //     console.log("---------------------- GroupByGenerator ----------------------");
    //     let grbyGen = GroupByGenerator.setGroupingColumns("c1", "c2")
    //         .count()
    //         .count("c3")
    //         .sum("c3")
    //         .avg("c3")
    //         .max("c3")
    //         .min("c3")
    //         .customAggregator("c3", "rms", arr => {
    //             let result = 0;
    //             for (let i = 0; i < arr.length; i++)
    //                 result += arr[i] * arr[i];
    //             return Math.sqrt(result / arr.length);
    //         });

    //     grbyGen = grbyGen.build();
    //     console.log(grbyGen);

    //     console.log("---------------------- WindowGenerator ----------------------");
    //     let wGen = WindowGenerator
    //         .partitionBy("team")
    //         .orderBy(SortGenerator.asc("salary"))

    //         .rowNumber()
    //         .rank()
    //         .denseRank()
    //         .ntile(4)

    //         .lead("salary", 2)
    //         .lag("salary")

    //         .customNonFrameFunction("c_row", arr => {
    //             let r = 5;
    //             arr.forEach(item => {
    //                 // item.shady_prop = -99;  // not good as not alias. solved.
    //                 // item.team = "dope";     // already blocked by modify proxy
    //                 item.c_row = r--;
    //             })
    //         })

    //         .firstValue("salary")
    //         .lastValue("salary")
    //         .nthValue("salary", 20)

    //         .collectList("salary", "all_sal")
    //         .count()
    //         .count("salary")
    //         .sum("salary")
    //         .avg("salary")
    //         .max("salary")
    //         .min("salary", "PTNmin", WindowFrame.rows(-1, 1))

    //         .customFrameFunction("salary", "rms",
    //             arr => {
    //                 const result = arr.reduce((acc, elm) => acc + elm * elm, 0);
    //                 return Math.sqrt(result / arr.length);
    //             },
    //             WindowFrame.rows(-1, 1)
    //         )

    //         .build();

    //     console.log(wGen);
    //     // console.log(JSON.stringify(wGen, null, 2));

    // console.log("---------------------- PivotGenerator ----------------------");
    // const pGen = PivotGenerator.pivotOn("region")
    //     .values("quater", "channel")
    //     // .fillMissing(0)
    //     .build();
    // console.log(JSON.stringify(pGen, null, 2));

    // console.log("---------------------- UnPivot/ Melt Generator ----------------------");
    // const mGen = MeltGenerator
    //     .fromColumns("c1", "c2")
    //     .columnNamesTo("c")
    //     .valuesTo("v");
    // const p = JSON.stringify(mGen.build(), null, 2);
    // console.log(p);

    console.log("---------------------- Merge (upsert) Generator ----------------------");


}
