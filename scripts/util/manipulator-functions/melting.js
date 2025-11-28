import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function melt(arr, { meltConfig, restColumns }) {
    const { sourceColumns, groupColumnName, valueColumnName } = meltConfig;

    const len = arr.length;
    const sourceColsLen = sourceColumns.length;
    const result = new Array(len * sourceColsLen);
    let idx = 0;
    for (let i = 0; i < len; i++) {
        const row = arr[i];

        // base object creation
        const baseObj = {};
        for (const col of restColumns)
            baseObj[col] = row[col];

        // result object creation
        for (let j = 0; j < sourceColsLen; j++) {
            const col = sourceColumns[j];
            result[idx++] = {
                ...baseObj,
                [groupColumnName]: col,
                [valueColumnName]: row[col]
            };
        }
    }
    return result;
}

// --------------- Configuration Object creator for melt ---------------

const constructorKey = Symbol("MeltGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for Melting / Unpivoting.
 * Call fromColumns() static method to create it's instance & set the columns which you want to melt.
 * Then OPTIONALLY chain methods
 * - columnNamesTo() to set the column name for the melting column names. default is "type".
 * - valuesTo() to set the column name for the melting column datas. default is "value".
 *
 * NOTE: not-setting columnNamesTo() & valuesTo() may cause column name collision if they're already present in the data.
 */
export class MeltGenerator {
    #sourceColumns;         // the columns whose data is to be used for melting
    #newGroupColumnName;    // column name for the column data from source columns
    #newValueColumnName;    // column name for the row data from source columns

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize MeltGenerator using 'new'. Call static method fromColumns() instead.");

        this.#sourceColumns = [];
        this.#newGroupColumnName = null;
        this.#newValueColumnName = null;
    }

    /**
     * create Melt & set the column names which need to be melted or unpivoted.
     * @param  {...string} sourceColumns
     * @returns {MeltGenerator}
     */
    static fromColumns(...sourceColumns) {
        if (sourceColumns.length <= 0)
            throw new Error("No source column names passed for melting.");
        sourceColumns.forEach(col => validateDataType(col, DataTypes.string));

        const tmpObj = new MeltGenerator(constructorKey);
        tmpObj.#sourceColumns = Object.freeze(sourceColumns);
        return tmpObj;
    }

    /**
     * set the new column name for value column.
     * @param {string} valueColumnName
     * @returns {MeltGenerator}
     */
    valuesTo(valueColumnName) {
        validateDataType(valueColumnName, DataTypes.string);
        this.#newValueColumnName = valueColumnName;
        return this;
    }

    /**
     * set the new column name for melting columns.
     * @param {string} groupColumnName
     * @returns {MeltGenerator}
     */
    columnNamesTo(groupColumnName) {
        validateDataType(groupColumnName, DataTypes.string);
        this.#newGroupColumnName = groupColumnName;
        return this;
    }

    /**
     * make object immutable & return (source columns array, value column name, group by column name)
     * @returns immutable melting configuration
     */
    build() {
        if (this.#newValueColumnName === null)
            this.#newValueColumnName = "value";

        if (this.#newGroupColumnName === null)
            this.#newGroupColumnName = "type";

        if (this.#newValueColumnName === this.#newGroupColumnName)
            throw new Error(`Cannot have same column name for both value & grouping column. '${this.#newValueColumnName}'`);

        return Object.freeze({
            sourceColumns: this.#sourceColumns,
            groupColumnName: this.#newGroupColumnName,
            valueColumnName: this.#newValueColumnName
        });
    }
}
