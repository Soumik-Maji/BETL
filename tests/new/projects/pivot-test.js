import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { GroupByGenerator } from "../../../scripts/util/manipulator-functions/grouping.js";
import { PivotGenerator } from "../../../scripts/util/manipulator-functions/pivoting.js";

export async function main() {
    const data = [
        { "region": "North", "quater": "Q1", "channel": "Online", "revenue": 100, "units": 10 },
        { "region": "North", "quater": "Q1", "channel": "Retail", "revenue": 80, "units": 8 },
        { "region": "North", "quater": "Q2", "channel": "Online", "revenue": 150, "units": 15 },
        { "region": "North", "quater": "Q2", "channel": "Retail", "revenue": 120, "units": null }
    ];

    // const data = [
    //     { region: 'North', quater: 'Q1', revenue: 100 },
    //     { region: 'South', quater: 'Q2', revenue: 150 }
    // ];

    const start = performance.now();
    const sample = ObjectArray.createInstance(data);
    const result = sample
        .log(0, "Original")
        .pivot(PivotGenerator
            .pivotOn("quater")
            .values("revenue", "units")
        )
        .log(0, "pivot-1")
        .pivot(PivotGenerator
            .pivotOn("channel")
            .values("Q1_revenue", "Q1_units", "Q2_revenue", "Q2_units")
        )
        .log(0, "pivot-2")
        ;

    console.log(`${performance.now() - start} ms`);
}
