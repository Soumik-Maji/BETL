import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function pivot(arr, { pivotConfig, columnsTillHere }) {
    const { pivotCol, valuesCol, fillMissing } = pivotConfig;

    // column on which grouping happens
    const groupCols = columnsTillHere.filter(col => !valuesCol.includes(col) && col !== pivotCol);

    const groupMap = new Map();     // to accumulate the rows which adhere to the grouping columns
    const pivotValuesSet = new Set();    // to collect the unqiue pivot-column row data
    for (const row of arr) {
        const key = groupCols.map(col => row[col]).join("\u0001");

        let groupRow = groupMap.get(key);
        if (groupRow === undefined) {       // on 1st encounter collect only the grouping columns
            groupRow = {};                  // from 2nd time this is not required
            for (const col of groupCols)
                groupRow[col] = row[col];
            groupMap.set(key, groupRow);
        }

        const pivotValue = row[pivotCol];
        pivotValuesSet.add(pivotValue);

        for (const vc of valuesCol) {
            const colName = `${pivotValue}_${vc}`;

            // if a group has same pivot-column row data then throw error
            if (groupRow.hasOwnProperty(colName)) {
                throw new Error(`ROW + PIVOT column '${key}' group is present more than once in data.
Use aggregation or deduplication to resolve them before pivoting.`);
            }
            groupRow[colName] = row[vc];    // increamentally collect the value columns
        }
    }

    // collect pivot & append with value columns to get new column names
    const pivotValues = Array.from(pivotValuesSet);
    const pivotColumns = pivotValues.flatMap(pv => valuesCol.map(vc => `${pv}_${vc}`));

    // checking all rows for missing values to fill them with DEFAULT pivot-value data
    const groupRows = Array.from(groupMap.values());    // materialize the values into an array
    for (const row of groupRows) {
        for (const colName of pivotColumns) {
            if (!row.hasOwnProperty(colName))
                row[colName] = fillMissing;
        }
    }

    return {
        resultData: groupRows,
        resultColumns: [...groupCols, ...pivotColumns]
    };
}

// --------------- Configuration Object creator for pivot ---------------

const constructorKey = Symbol("PivotGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for Pivoting.
 * - Call static method pivotOn() with a column name to pivot by for creating a instance of this class.
 * - Then mandatory chain values() method for setting the value columns.
 * - Then OPTIONALLY chain fillMissing() method to put custom missing values (default is null).
 *
 *  This works for 1 pivot column at a time. For multiple pivot columns chain the main pivot function from ObjectArray.
 */
export class PivotGenerator {
    #pivotCol;      // single column to pivot on
    #values;        // columns to transpose
    #fillMissing;   // missing value (default is null)

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize PivotGenerator using 'new'. Call static method pivotOn() instead.");

        this.#pivotCol = null;
        this.#values = [];
        this.#fillMissing = null;
    }

    /**
     * create pivot & set the pivoting columns of pivot
     * @param {string} column
     * @returns {PivotGenerator}
     */
    static pivotOn(column) {
        validateDataType(column, DataTypes.string);

        const obj = new PivotGenerator(constructorKey);
        obj.#pivotCol = column;
        return obj;
    }

    /**
     * to set the value columns which are to be used for gathering the values
     * @param  {...string} columns
     * @returns {PivotGenerator}
     */
    values(...columns) {
        if (columns.length <= 0)
            throw new Error("No column passed for values");
        columns.forEach(col => validateDataType(col, DataTypes.string));

        this.#values = Object.freeze(columns);
        return this;
    }

    /**
     * OPTIONALLY call this to set custom missing value
     * @param {*} value
     * @returns {PivotGenerator}
     */
    fillMissing(value) {
        this.#fillMissing = value;
        return this;
    }

    /**
     * make object immutable & return (pivot column, values column, [optionally] fill missing value)
     * @returns immutable pivoting configuration
     */
    build() {
        if (this.#values.length <= 0)
            throw new Error("No values column set");

        return Object.freeze({
            pivotCol: this.#pivotCol,
            valuesCol: this.#values,
            fillMissing: this.#fillMissing
        });
    }
}
