import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function groupBy(arr, { groupingConfig }) {
    const { groupingColumns, logics } = groupingConfig;

    const len = arr.length;
    if (len === 0)
        return [];

    // get unqiue of all the aggregating columns except empty strings
    const aggregatingColumns = [...new Set(logics.map(l => l.column).filter(c => c !== ""))];

    const groups = new Map();
    for (let i = 0; i < len; i++) {
        const item = arr[i];

        // create the key for map using intermediate object
        const keyObj = {};
        groupingColumns.forEach(col => keyObj[col] = item[col]);
        const key = JSON.stringify(keyObj);

        let groupValue = groups.get(key);
        if (!groupValue) {
            groupValue = [];
            groups.set(key, groupValue);
        }

        // put the required columns into map's value using intermediary object
        const tmpObj = {};
        aggregatingColumns.forEach(col => tmpObj[col] = item[col]);
        groupValue.push(tmpObj);
    }

    const newData = [];
    for (const [key, groupValue] of groups) {
        // parse key to get back grouping columns, data & row object
        const tmpObj = JSON.parse(key);

        for (const { column, alias, aggFunc } of logics) {
            const tmpArr = groupValue.map(item => item[column]);
            const aggResult = aggFunc(tmpArr);  // apply aggregation function
            tmpObj[alias] = aggResult;          // and store in the row object
        }
        newData.push(tmpObj);
    }
    return newData;
}

// --------------- Configuration Object creator for group by ---------------

const constructorKey = Symbol("GroupByGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for GroupBy.
 * Call static method setGroupingColumns() with column names to group by for creating a instance of this class.
 * Then chain the customAggregator() method or it's convenience wrappers count, sum, avg, max, min to use the aggregators.
 */
export class GroupByGenerator {
    #columns;   // columns on which the grouping is done
    #logics;    // array which contains the logics for aggregation

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize GroupByGenerator using 'new'. Call static method setGroupingColumns() instead.");

        this.#columns = [];
        this.#logics = [];
    }

    /**
     * create group & set the grouping columns of group
     * @param  {...string} columnNames
     * @returns {GroupByGenerator}
     */
    static setGroupingColumns(...columnNames) {
        // validating the parameters
        if (columnNames.length <= 0)
            throw new Error("No column names to group by.");

        columnNames.forEach(col => validateDataType(col, DataTypes.string, "Grouping column name is not string."));

        const tmpObj = new GroupByGenerator(constructorKey);
        tmpObj.#columns = [...(new Set(columnNames))];
        return tmpObj;
    }

    /**
     * stacks the logics for grouping
     * @param {string} column
     * @param {string} alias
     * @param {function} aggregationFunction
     * @returns {GroupByGenerator}
     */
    customAggregator(column, alias, aggregationFunction) {
        // validating the parameters
        validateDataType(column, DataTypes.string, "Aggregation column name is not string.");
        validateDataType(alias, DataTypes.string, "Alias for aggregation column is not string.");
        validateDataType(aggregationFunction, DataTypes.function, "Aggregation function is not function.");

        if (this.#logics.some(lg => lg.alias === alias))
            throw new Error(`Cannot use same alias ${alias} twice`);

        this.#logics.push(Object.freeze({
            column, alias,
            aggFunc: aggregationFunction
        }));
        return this;
    }

    /**
     * make logics immutable & return
     * @returns immutable logics
     */
    build() {
        return Object.freeze({
            groupingColumns: this.#columns,
            logics: Object.freeze(this.#logics)
        });
    }

    // ---------------------- Convenience Wrappers ----------------------
    // May have strange quirks of JavaScript's type system.

    /**
     * creates count aggregator
     * @param {string} columnName
     * @param {string} [alias]
     * @returns {GroupByGenerator}
     */
    count(columnName, alias) {
        if (columnName === undefined || columnName === null || columnName === "") {
            alias ??= "count_all";
            const aggFunc = arr => arr.length;

            this.#logics.push(Object.freeze({
                column: "",
                alias, aggFunc,
                ignore: true,
            }));
            return this;
        }

        return this.customAggregator(
            columnName,
            alias ?? `count_${columnName}`,
            arr => {
                let len = arr.length, count = 0;
                for (let i = 0; i < len; i++) {
                    const elm = arr[i];
                    if (elm !== undefined && elm !== null)
                        count++;
                }
                return count;
            }
        );
    }

    /**
     * creates count aggregator
     * @param {string} columnName
     * @param {string} [alias]
     * @returns {GroupByGenerator}
     */
    collectList(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias ?? `collectList_${columnName}`,
            arr => arr
        );
    }

    /**
     * creates sum aggregator
     * @param {string} columnName
     * @param {string} [alias]
     * @returns {GroupByGenerator}
     */
    sum(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias ?? `sum_${columnName}`,
            arr => {
                let len = arr.length, total = 0;
                for (let i = 0; i < len; i++) {
                    const elm = arr[i];
                    if (elm === undefined || elm === null || Number.isNaN(elm))
                        continue;
                    else if (typeof elm === "number")
                        total += elm;
                    else
                        throw new Error(`${columnName} has non-numerical data in sum: ${elm}`);
                }
                return total;
            }
        );
    }

    /**
     * creates average aggregator
     * @param {string} columnName
     * @param {string} [alias]
     * @returns {GroupByGenerator}
     */
    avg(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias ?? `avg_${columnName}`,
            arr => {
                let total = 0, lenNumeric = 0, len = arr.length;
                for (let i = 0; i < len; i++) {
                    const elm = arr[i];
                    if (elm === undefined || elm === null || Number.isNaN(elm))
                        continue;
                    else if (typeof elm === "number") {
                        total += elm;
                        lenNumeric++;
                    }
                    else
                        throw new Error(`${columnName} has non-numerical data in average: ${elm}`);
                }
                return lenNumeric > 0 ? total / lenNumeric : null;
            }
        );
    }

    /**
     * creates maximum aggregator
     * @param {string} columnName
     * @param {string} [alias]
     * @returns {GroupByGenerator}
     */
    max(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias ?? `max_${columnName}`,
            arr => {
                let maxVal = null, len = arr.length, comparatorFunc = null;
                for (let i = 0; i < len; i++) {
                    const elm = arr[i];
                    if (elm === undefined || elm === null || Number.isNaN(elm))
                        continue;

                    if (comparatorFunc === null) {
                        if ((typeof elm) === "number" || elm instanceof Date)
                            comparatorFunc = (a, b) => a > b ? a : b;
                        else
                            comparatorFunc = (a, b) => (a.toString()).localeCompare(b.toString()) > 0 ? a : b;

                        maxVal = elm;
                        continue;
                    }
                    maxVal = comparatorFunc(maxVal, elm);
                }
                return maxVal;
            }
        );
    }

    /**
     * creates minimum aggregator
     * @param {string} columnName
     * @param {string} [alias]
     * @returns {GroupByGenerator}
     */
    min(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias ?? `min_${columnName}`,
            arr => {
                let minVal = null, len = arr.length, comparatorFunc = null;
                for (let i = 0; i < len; i++) {
                    const elm = arr[i];
                    if (elm === undefined || elm === null || Number.isNaN(elm))
                        continue;

                    if (comparatorFunc === null) {
                        if ((typeof elm) === "number" || elm instanceof Date)
                            comparatorFunc = (a, b) => a < b ? a : b;
                        else
                            comparatorFunc = (a, b) => (a.toString()).localeCompare(b.toString()) < 0 ? a : b;

                        minVal = elm;
                        continue;
                    }
                    minVal = comparatorFunc(minVal, elm);
                }
                return minVal;
            }
        );
    }
}
