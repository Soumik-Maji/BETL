import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, validateDataType } from "../ParameterValidator.js";
import { SortGenerator, sort } from "./sorting.js";

function checkColumnsMatching(expectedCols, actualCols) {
    if (expectedCols.length !== actualCols.length)
        throw new Error(`Columns do not match up properly. Extra properties present.
    expected: ${expectedCols}
    actual: ${actualCols}`);

    const sorted1 = [...expectedCols].sort();
    const sorted2 = [...actualCols].sort();

    if (!(sorted1.every((val, idx) => val === sorted2[idx])))
        throw new Error(`Columns do not match up properly. Column names mismatch.
    expected: ${expectedCols}
    actual: ${actualCols}`);
}

export function windowing(arr, { windowConfig, newColumns }) {
    const { groupingColumns, sortingData, windowingData } = windowConfig;

    const len = arr.length;
    if (len === 0)
        return [];

    const uniques = new Map();
    for (let i = 0; i < len; i++) {
        const item = arr[i];
        // building key
        const key = groupingColumns.map(col => item[col]).join("\u0001");

        let group = uniques.get(key);
        if (!group) {
            group = [];
            uniques.set(key, group);
        }
        group.push(item);
    }

    // get first value from the unqiues for validation
    const groupForTest = JsonModifier.arrayOfObjectsProxy(
        sort(
            uniques.get(uniques.keys().next().value),
            { comparisonLogics: sortingData }
        ),
        { setProxy: false }
    );

    // validating every window functions for illegal operations
    performWindowing(groupForTest, windowingData);
    checkColumnsMatching(newColumns, Object.keys(groupForTest[0]));

    // applying to actual data
    const newData = [];
    for (let value of uniques.values()) {
        sort(value, { comparisonLogics: sortingData });
        performWindowing(value, windowingData);
        newData.push(...value);
    }
    return newData;
}

function performWindowing(arr, windowingData) {
    for (const { type, column, alias, windowFunction, frame, ignore } of windowingData) {
        // apply normally for non-frame functions. depends on outer value to update column. different for every row.
        if (type === 0)
            windowFunction(arr);

        // need some code fuckery for frame functions. no outer value needed to update column. same for every row.
        else if (type === 1) {
            // pulled out requried column
            const aggCol = ignore ? arr : arr.map(item => item[column]);

            const len = arr.length;
            // get frame for every element of the array
            for (let i = 0; i < len; i++) {
                if (frame instanceof RowFrame) {
                    const startIndex = Math.max(0, i + frame.start);
                    const endIndex = Math.min(len, i + frame.end + 1);
                    const arrayFrame = aggCol.slice(startIndex, endIndex);
                    const aggVal = windowFunction(arrayFrame);
                    arr[i][alias] = aggVal;
                }
                else if (frame instanceof RangeFrame) { }
            }

            // STEPS -
            // half-done: get frame from main array [range frame not done]
            // done: apply window function on the frame
            // done: put the return value on every element of the frame with alias (update in-place)

            // SEE IF -
            // group by like feature can be implemented here where only data of the column name will pulled out
            // thus easing the user's implementation of  custom function
        }
    }
}

// --------------- Configuration Object creator for windowing ---------------

class RowFrame {
    constructor(start, end) {
        this.start = start;     // integers: negative = PRECEDING, positive = FOLLOWING
        this.end = end;
    }
}
class RangeFrame {
    constructor(column, lower, upper) {
        this.column = column;   // ordered column name
        this.lower = lower;     // numeric deltas
        this.upper = upper;
    }
}

/**
 * This object packs & exposes - 2 functions & 2 extreme ends of data
 *
 * rows (rows between)
 * range (range between)
 * beginning (unbounded preceding)
 * end (unbounded following)
 */
export const WindowFrame = {
    rows: (start, end) => new RowFrame(start, end),
    range: (columns, start, end) => new RangeFrame(columns, start, end),
    beginning: Number.NEGATIVE_INFINITY,
    end: Number.POSITIVE_INFINITY
};

const constructorKey = Symbol("WindowGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for Windowing.
 * partitionBy, orderBy, customNonFrameFunction, customFrameFunction, count, sum, avg, max, min
 * methods have static versions. So, call them with class name & chain them with rest.
 * Also WindowFrame is present, which allows a frame creation similar to rows between & range between.
 *
 * Methods available -
 * partitionBy, orderBy, customNonFrameFunction, customFrameFunction, rowNumber, rank, denseRank, ntile, lead, lag, firstValue,
 * lastValue, nthValue, count, sum, avg, max, min
 */
export class WindowGenerator {
    #groupingColumns;       // array of column names on which grouping is to be done
    #sortingConfig;         // SortLogicGenerator instance to handle sorting data
    #windowFunctionArray;   // array contains all the window functions used in calculation

    // booleans for tracking which options are set
    #isGroupingSet;
    #isSortingSet;
    #isWindowFunctionSet;

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize WindowGenerator using 'new'. Call static methods instead.");

        this.#groupingColumns = [];
        this.#sortingConfig = [];
        this.#windowFunctionArray = [];

        this.#isGroupingSet = false;
        this.#isSortingSet = false;
        this.#isWindowFunctionSet = false;
    }

    static {
        const functionsArray = [
            "partitionBy", "orderBy", "customNonFrameFunction", "customFrameFunction",
            "collectList", "count", "sum", "avg", "max", "min"
        ];
        functionsArray.forEach(method => {
            WindowGenerator[method] = function (...args) {
                const obj = new WindowGenerator(constructorKey);
                return obj[method](...args);
            }
        });
    }

    partitionBy(...columnNames) {
        if (this.#isGroupingSet)
            throw new Error("Cannot set partition more than once.");
        if (this.#isSortingSet || this.#isWindowFunctionSet)
            throw new Error("Cannot set partition after setting order or any window function.");

        if (columnNames.length <= 0)
            throw new Error("No column names to partition by.");
        columnNames.forEach(col => validateDataType(col, DataTypes.string, `Partitioning column name ${col} is not string.`));

        this.#isGroupingSet = true;
        this.#groupingColumns = Object.freeze([...(new Set(columnNames))]);
        return this;
    }

    orderBy(sortConfig) {
        if (this.#isSortingSet)
            throw new Error("Cannot set config for sorting order more than once.");
        if (this.#isWindowFunctionSet)
            throw new Error("Cannot set sorting order after setting any window function.");

        if (!(sortConfig instanceof SortGenerator))
            throw new Error("Sorting config must be set using SortLogicGenerator.");

        this.#isSortingSet = true;
        this.#sortingConfig = sortConfig.build();
        return this;
    }

    build() {
        if (!this.#isWindowFunctionSet)
            throw new Error("No window function is provided.");

        return Object.freeze({
            groupingColumns: this.#groupingColumns,
            sortingData: this.#sortingConfig,
            windowingData: this.#windowFunctionArray
        });
    }

    // ---------------------- ACTUAL WINDOW FUNCTIONS ----------------------

    customNonFrameFunction(alias, windowFunction) {
        this.#isWindowFunctionSet = true;

        validateDataType(alias, DataTypes.string);
        validateDataType(windowFunction, DataTypes.function);

        this.#windowFunctionArray.push(Object.freeze({
            "type": 0,
            alias,
            windowFunction
        }));
        return this;
    }

    customFrameFunction(column, alias, windowFunction, frame) {
        this.#isWindowFunctionSet = true;

        validateDataType(column, DataTypes.string);
        validateDataType(alias, DataTypes.string);
        validateDataType(windowFunction, DataTypes.function);
        if (!(frame instanceof RowFrame || frame instanceof RangeFrame))
            throw new Error("frame must be instance of WindowFrame.");

        this.#windowFunctionArray.push(Object.freeze({
            "type": 1,
            column, alias,
            windowFunction,
            frame
        }));
        return this;
    }

    // ---------------------- Convenience Wrappers ----------------------
    // May have strange quirks of JavaScript's type system.

    // SERIAL / POSITIONAL FUNCTIONS

    rowNumber(alias = "row_number") {
        if (!this.#isSortingSet)
            throw new Error("rowNumber window function requires sorted data to work with.");

        return this.customNonFrameFunction(alias, arr => {
            const len = arr.length;
            let rn = 1;
            for (let i = 0; i < len; i++)
                arr[i][alias] = rn++;
        });
    }

    rank(alias = "rank") {
        if (!this.#isSortingSet)
            throw new Error("rank window function requires sorted data to work with.");

        const sortingCols = this.#sortingConfig.map(item => item.column);
        return this.customNonFrameFunction(alias, arr => {
            const len = arr.length;
            let rn = 1, prevKey = null;
            for (let i = 0; i < len; i++) {
                const item = arr[i];
                const currKey = sortingCols.map(col => item[col]).join("\u0001");
                if (prevKey !== null && prevKey !== currKey)
                    rn = i + 1;
                item[alias] = rn;
                prevKey = currKey;
            }
        });
    }

    denseRank(alias = "dense_rank") {
        if (!this.#isSortingSet)
            throw new Error("denseRank window function requires sorted data to work with.");

        const sortingCols = this.#sortingConfig.map(item => item.column);
        return this.customNonFrameFunction(alias, arr => {
            const len = arr.length;
            let rn = 1, prevKey = null;
            for (let i = 0; i < len; i++) {
                const item = arr[i];
                const currKey = sortingCols.map(col => item[col]).join("\u0001");
                if (prevKey !== null && prevKey !== currKey)
                    rn++;
                item[alias] = rn;
                prevKey = currKey;
            }
        });
    }

    ntile(n, alias = "ntile") {
        if (!this.#isSortingSet)
            throw new Error("ntile window function requires sorted data to work with.");

        validateDataType(n, DataTypes.number);
        if (n < 1)
            throw new Error(`Number of buckets for ntile can't be less than 1. Provided ${n}`);

        return this.customNonFrameFunction(alias, arr => {
            const len = arr.length, baseSize = Math.floor(len / n);
            let extra = len % n;
            let i = 0, tile = 1;

            while (i < len) {
                const groupSize = baseSize + (extra > 0 ? 1 : 0);
                for (let j = 0; j < groupSize && i < len; j++, i++) {
                    arr[i][alias] = tile;
                }
                tile++;
                if (extra > 0) extra--;
            }
        });
    }

    // OFFSET FUNCTIONS

    lead(columnName, offset = 1, alias = undefined, defaultValue = null) {
        if (!this.#isSortingSet)
            throw new Error("lead window function requires sorted data to work with.");

        validateDataType(columnName, DataTypes.string);
        validateDataType(offset, DataTypes.number);

        alias ??= `lead_${offset}_${columnName}`;

        return this.customNonFrameFunction(alias, arr => {
            const len = arr.length;
            for (let i = 0; i < len; i++) {
                const leadIndex = i + offset;
                if (leadIndex >= len)
                    arr[i][alias] = defaultValue;
                else
                    arr[i][alias] = arr[leadIndex][columnName];
            }
        });
    }

    lag(columnName, offset = 1, alias = undefined, defaultValue = null) {
        if (!this.#isSortingSet)
            throw new Error("lag window function requires sorted data to work with.");

        validateDataType(columnName, DataTypes.string);
        validateDataType(offset, DataTypes.number);

        alias ??= `lag_${offset}_${columnName}`;

        return this.customNonFrameFunction(alias, arr => {
            const len = arr.length;
            for (let i = 0; i < len; i++) {
                const leadIndex = i - offset;
                if (leadIndex < 0)
                    arr[i][alias] = defaultValue;
                else
                    arr[i][alias] = arr[leadIndex][columnName];
            }
        });
    }

    // VALUE ACCESS FUNCTIONS

    firstValue(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        if (!this.#isSortingSet)
            throw new Error("firstValue window function requires sorted data to work with.");

        return this.customFrameFunction(
            columnName,
            alias ?? `first_${columnName}`,
            arr => arr[0],
            frame
        );
    }

    lastValue(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        if (!this.#isSortingSet)
            throw new Error("lastValue window function requires sorted data to work with.");

        return this.customFrameFunction(
            columnName,
            alias ?? `last_${columnName}`,
            arr => arr[arr.length - 1],
            frame
        );
    }

    nthValue(columnName, n, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        if (!this.#isSortingSet)
            throw new Error("nthValue window function requires sorted data to work with.");

        validateDataType(n, DataTypes.number);
        if (n < 0)
            throw new Error(`nth_value follows JS array indexing. 'n' cannot be less than 0. Provided ${n}`);
        return this.customFrameFunction(
            columnName,
            alias ?? `nth_${columnName}`,
            arr => (n > arr.length) ? null : arr[n],
            frame
        );
    }

    // AGGREGATIONAL FUNCTIONS

    collectList(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        return this.customFrameFunction(
            columnName,
            alias ?? `collectList_${columnName}`,
            arr => arr,
            frame
        );
    }

    count(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        if (columnName === undefined || columnName === null || columnName === "") {
            alias ??= "count_all";
            this.#windowFunctionArray.push(Object.freeze({
                "type": 1,
                column: columnName,
                alias,
                windowFunction: arr => arr.length,
                frame,
                ignore: true
            }));
            return this;
        }

        return this.customFrameFunction(
            columnName,
            alias ?? `count_${columnName}`,
            arr => {
                const len = arr.length;
                let count = 0;
                for (let i = 0; i < len; i++) {
                    const elm = arr[i];
                    if (elm !== undefined && elm !== null)
                        count++;
                }
                return count;
            }, frame);
    }

    sum(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        return this.customFrameFunction(
            columnName,
            alias ?? `sum_${columnName}`,
            arr => {
                const len = arr.length;
                let total = 0;
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
            },
            frame
        );
    }

    avg(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        return this.customFrameFunction(
            columnName,
            alias ?? `avg_${columnName}`,
            arr => {
                const len = arr.length;
                let total = 0, lenNumeric = 0;
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
            },
            frame
        );
    }

    max(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        return this.customFrameFunction(
            columnName,
            alias ?? `max_${columnName}`,
            arr => {
                const len = arr.length;
                let maxVal = null, comparatorFunc = null;
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
            },
            frame
        );
    }

    min(columnName, alias = undefined, frame = WindowFrame.rows(WindowFrame.beginning, WindowFrame.end)) {
        return this.customFrameFunction(
            columnName,
            alias ?? `min_${columnName}`,
            arr => {
                const len = arr.length;
                let maxVal = null, comparatorFunc = null;
                for (let i = 0; i < len; i++) {
                    const elm = arr[i];
                    if (elm === undefined || elm === null || Number.isNaN(elm))
                        continue;

                    if (comparatorFunc === null) {
                        if ((typeof elm) === "number" || elm instanceof Date)
                            comparatorFunc = (a, b) => a < b ? a : b;
                        else
                            comparatorFunc = (a, b) => (a.toString()).localeCompare(b.toString()) < 0 ? a : b;

                        maxVal = elm;
                        continue;
                    }
                    maxVal = comparatorFunc(maxVal, elm);
                }
                return maxVal;
            },
            frame
        );
    }
}
