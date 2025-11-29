import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { MappingGenerator } from "../../../scripts/util/manipulator-functions/mapping.js";

export function main() {
    const data1 = [
        { "left1name": "Tom", "left2age": 45 },
        { "left1name": "Sam", "left2age": 46 }
    ];

    const data2 = [
        { "left1NAME": "Bob", "left2AGE": 38 },
        { "left1NAME": "Mat", "left2AGE": 40 }
    ];

    const data3 = [
        { "1name": 'Tom', "2age": 45 },
        { "1name": 'Sam', "2age": 46 }
    ];

    const oa1 = ObjectArray.createInstance(data1);
    const oa2 = ObjectArray.createInstance(data2);
    let eoa = ObjectArray.createEmptyInstance("name", "age");

    // const oa3 = ObjectArray.createInstance(data3);
    // oa3.log();

    // eoa.log(0, "result");
    // oa1.log(0, "data 1");
    // oa2.log(0, "data 2");

    // eoa
    //     .map(
    //         MappingGenerator.setSource(oa1)
    //             .relate("name", "left1name")
    //             .relate("age", "left2age")
    //     )
    //     .map(
    //         MappingGenerator.setSource(oa2)
    //             .relate("name", "left1NAME")
    //             .relate("age", "left2AGE")
    //     )
    //     .log(0, "result");

    eoa = oa1
        .log(0, "Before renaming")

        .rename("left1name", "leftright").rename("left2age", "LEFTright")
        .renameRegex("left*", "$0")     // produces invalid column name
        .renameRegex("LEFT*", "$0")     // produces invalid column name

        // .rename("left1name", "right").rename("left2age", "RIGHT")
        // .renameWith(item => item.toLowerCase())
        ;

    console.log(eoa.logicPlan);
    console.log(eoa.columns);
    eoa.log(0, "After renaming");

    /*
        renameWith() method written.
        check the issue of new column name overlapping with other old column names & each other
        make it robust AF & defensively throw any error caught
        https://chatgpt.com/c/690b5140-f788-8323-b9dd-992fd36d4118
    */
}

/*
    implement a separate core function for bulk renaming,
    because rename will SURELY happen for all columns.

    apply renaming function or regex send by user on all columns.
    then check which new columns are getting repeated in new column names, throw error for such case.
    if no new columns collide then perform a topological sort on names mapping to
    resolve any name dependency or circular naming issues.
*/
/*
    current rename with function passed method:-

    renameWith(renameFunction) {
        validateDataType(renameFunction, DataTypes.function, "Function passed for renaming is not a function.");
        validateDataType(renameFunction(this.#columns[0]), DataTypes.string, "Renaming function does not return a string.");

        const newColumns = [];
        for (let i = 0; i < this.#columns.length; i++) {
            const col = this.#columns[i];
            const newCol = renameFunction(col);
            if (newCol === col)
                continue;
            validateNewColumn(this.#columns, newCol);
            newColumns.push({ oldKey: col, newKey: newCol });
        }
        if (newColumns.length === 0)
            return this;

        let tempInstance = this;

        newColumns.forEach(({ oldKey, newKey }) =>
            tempInstance = tempInstance.#internalCreateInstance(
                rename,
                { oldKey, newKey },
                tempInstance.#columns.map(col => col === oldKey ? newKey : col)  // replacing the column name
            )
        );

        return tempInstance;
    }

*/
