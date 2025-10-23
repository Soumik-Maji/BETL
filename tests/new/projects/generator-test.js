import { SortLogicGenerator } from "../../../scripts/util/manipulator-functions/sorting.js";

export function main() {

    const slg = SortLogicGenerator.createInstance()
        .asc("c1")
        .desc("c2", item => Number(item))
        // .desc("c1", item => new Date(item))
        .build();

    console.log(slg);

}
