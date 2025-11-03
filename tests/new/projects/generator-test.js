import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { GroupByGenerator } from "../../../scripts/util/manipulator-functions/grouping.js";
import { MappingGenerator } from "../../../scripts/util/manipulator-functions/mapping.js";
import { SortLogicGenerator } from "../../../scripts/util/manipulator-functions/sorting.js";

export function main() {

    // ---------------------- SortLogicGenerator ----------------------
    // const slg = SortLogicGenerator.createInstance()
    //     .asc("c1")
    //     .desc("c2", item => Number(item))
    //     // .desc("c1", item => new Date(item))
    //     .build();

    // console.log(slg);

    // ---------------------- MappingGenerator ----------------------
    // const data = [
    //     { "name": "Roxy", "age": 25 },
    //     { "name": "Tom", "age": 12 },
    //     { "name": "Sam", "age": 17 },
    //     { "name": "Joel", "age": 23 }
    // ];

    // const oa = ObjectArray.createInstance(data)
    //     .addColumn("eligible", item => item.age > 18);

    // const mg = MappingGenerator.setSource(oa)
    //     .relate("username", "name")
    //     .relate("reg_date", "age")
    //     .relate("eligible", "eligible")
    //     .build();
    // console.log(JSON.stringify(mg, null, 2));
    // console.log(mg);

    // ---------------------- DeduplicateGenerator ----------------------
    // let dedupGen = DeduplicateGenerator.setDeduplicatingColumns("c1", "c2", "c3")
    //     .setResolveFunction((arr) => { arr[3] ?? arr[0] });

    // dedupGen = dedupGen.build();
    // console.log(dedupGen);

    // ---------------------- GroupByGenerator ----------------------
    let grbyGen = GroupByGenerator.setGroupingColumns("c1", "c2")
        .count()
        .count("c3")
        .sum("c3")
        .avg("c3")
        .max("c3")
        .min("c3")
        .customAggregator("c3", "rms", arr => {
            let result = 0;
            for (let i = 0; i < arr.length; i++)
                result += arr[i] * arr[i];
            return Math.sqrt(result / arr.length);
        });

    grbyGen = grbyGen.build();
    console.log(grbyGen);

}
