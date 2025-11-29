import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { MeltGenerator } from "../../../scripts/util/manipulator-functions/melting.js";
import { PivotGenerator } from "../../../scripts/util/manipulator-functions/pivoting.js";
import { SortGenerator } from "../../../scripts/util/manipulator-functions/sorting.js";

export async function main() {
    test1();
    console.log("\n\n\n");
    test2();
}

function test2() {
    console.log("TEST 2");

    const data = [
        { "region": "North", "quater": "Q1", "channel": "Online", "revenue": 100, "units": 10 },
        { "region": "North", "quater": "Q1", "channel": "Retail", "revenue": 80, "units": 8 },
        { "region": "North", "quater": "Q2", "channel": "Online", "revenue": 150, "units": 15 },
        { "region": "North", "quater": "Q2", "channel": "Retail", "revenue": 120, "units": null }
    ];

    const itm = ObjectArray.createInstance(data)
        .log(0, "Expected output")
        .pivot(PivotGenerator
            .pivotOn("quater")
            .values("revenue", "units")
        )
        // .rename("region", "type")
        ;

    console.log("\n\n-------------------------------------- SEPARATOR --------------------------------------\n\n");

    ObjectArray.createInstance(itm.execute().data)
        .melt(MeltGenerator
            .fromColumns("Q1_revenue", "Q1_units", "Q2_revenue", "Q2_units")
            // .columnNamesTo("type")
            // .valuesTo("value")
        )
        .updateColumn("type", item => item.type.split("_"))
        .addColumn("quater", item => item.type[0])
        .addColumn("measure", item => item.type[1])
        .drop("type")
        .pivot(PivotGenerator.pivotOn("measure").values("value"))
        .renameRegex("*_value", "$0")
        .select("region", "quater", "channel", "revenue", "units")
        .sort(SortGenerator.asc("quater").asc("channel"))
        .log();
}

function test1() {
    console.log("TEST 1");

    const data = [
        { "region": "North", "quater": "Q1", "channel": "Online", "revenue": 100, "units": 10 },
        { "region": "North", "quater": "Q1", "channel": "Retail", "revenue": 80, "units": 8 },
        { "region": "North", "quater": "Q2", "channel": "Online", "revenue": 150, "units": 15 },
        { "region": "North", "quater": "Q2", "channel": "Retail", "revenue": 120, "units": null }
    ];

    const itm = ObjectArray.createInstance(data)
        .log(0, "Expected output")
        .pivot(PivotGenerator
            .pivotOn("quater")
            .values("revenue", "units")
        )
        .pivot(PivotGenerator
            .pivotOn("channel")
            .values("Q1_revenue", "Q1_units", "Q2_revenue", "Q2_units")
        );

    console.log("\n\n-------------------------------------- SEPARATOR --------------------------------------\n\n");

    ObjectArray.createInstance(itm.execute().data)
        // .log(0, "Original")
        .melt(MeltGenerator
            .fromColumns("Online_Q1_revenue", "Online_Q1_units", "Online_Q2_revenue", "Online_Q2_units",
                "Retail_Q1_revenue", "Retail_Q1_units", "Retail_Q2_revenue", "Retail_Q2_units")
            // .columnNamesTo("type")
            // .valuesTo("value")
        )
        // .log(0, "After melt")
        .updateColumn("type", item => item.type.split("_"))
        .addColumn("quater", item => item.type[1])
        .addColumn("channel", item => item.type[0])
        .addColumn("measure", item => item.type[2])
        .drop("type")
        // .log(0, "After Column formatting")
        .pivot(PivotGenerator.pivotOn("measure").values("value"))
        .renameRegex("*_value", "$0")
        .sort(SortGenerator.asc("quater").asc("channel"))
        .log(0, "Back to expected")
        ;
}
