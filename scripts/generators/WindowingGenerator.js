import { SortLogicGenerator } from "./SortLogicGenerator.js";
import { HTMLOutput } from "../outputs/HTMLOutput.js";

export class WindowingGenerator {

    static #isConstructorLocked = true;    // lock constructor to make it act like a private constructor

    #groupingColumns;       // array of column names on which grouping is to be done
    #sortingData;           // SortLogicGenerator instance to handle sorting data
    #windowFunctionArray;   // array contains all the window functions used for calculation
    constructor() {
        if (WindowingGenerator.#isConstructorLocked)
            HTMLOutput.showError("Cannot call WindowingGenerator with 'new'. Call static function createInstance().");
        this.#groupingColumns = [];
        this.#sortingData = null;
        this.#windowFunctionArray = [];
        WindowingGenerator.#isConstructorLocked = true;
    }

    /**
     * @returns new instance of WindowingGenerator class
     */
    static createInstance() {
        WindowingGenerator.#isConstructorLocked = false;
        return new WindowingGenerator();
    }

    partitionBy(...columnNames) {
        if (this.#groupingColumns.length !== 0)
            HTMLOutput.showError("Cannot set partition more than once.");
        if (this.#sortingData !== null || this.#windowFunctionArray.length !== 0)
            HTMLOutput.showError("If partitioning required, then set it before anything else.");

        this.#groupingColumns = Object.freeze(columnNames);
        return this;
    }

    orderBy(sortLogicGenerator) {
        if (!(sortLogicGenerator instanceof SortLogicGenerator))
            HTMLOutput.showError("Parameter must be instance of SortLogicGenerator.");
        if (this.#sortingData !== null)
            HTMLOutput.showError("Cannot set sort order more than once.");
        if (this.#windowFunctionArray.length !== 0)
            HTMLOutput.showError("If sorting required, then set it just after partitioning.");

        this.#sortingData = sortLogicGenerator;
        return this;
    }

    customWindowFunction(alias, windowFunction) {
        this.#windowFunctionArray.push(Object.freeze({
            alias,
            windowFunction,
        }));
        return this;
    }

    build() {
        return Object.freeze({
            groupingColumns: this.#groupingColumns,
            sortingData: this.#sortingData,
            windowingData: this.#windowFunctionArray
        });
    }

    // NOTE: below are some widely used windowing functions.
    // May have strange quirks of JavaScript's type system.

    // SERIAL / POSITIONAL FUNCTIONS

    rowNumber(alias = "row_number") {
        return this.customWindowFunction(alias, arr => {
            let rn = 1;
            arr.forEach(item => item[alias] = rn++);
        });
    }

    rank(alias = "rank") {
        if (this.#sortingData === null)
            HTMLOutput.showError("rank() requires sorted data to work with.");

        const sortingCols = this.#sortingData.build().map(item => item.column);
        return this.customWindowFunction(alias, arr => {
            let rn = 1, prevKey = null;
            arr.forEach((item, idx) => {
                const currKey = JSON.stringify(sortingCols.map(col => item[col]));
                if (prevKey !== null && prevKey !== currKey)
                    rn = idx + 1;
                item[alias] = rn;
                prevKey = currKey;
            });
        });
    }

    denseRank(alias = "dense_rank") {
        if (this.#sortingData === null)
            HTMLOutput.showError("denseRank() requires sorted data to work with.");

        const sortingCols = this.#sortingData.build().map(item => item.column);
        return this.customWindowFunction(alias, arr => {
            let rn = 1, prevKey = null;
            arr.forEach(item => {
                const currKey = JSON.stringify(sortingCols.map(col => item[col]));
                if (prevKey !== null && prevKey !== currKey)
                    rn++;
                item[alias] = rn;
                prevKey = currKey;
            });

        });
    }

    ntile(n, alias = "ntile") {
        if (this.#sortingData === null)
            HTMLOutput.showError("ntile() requires sorted data to work with.");

        if (typeof n !== 'number' || n <= 0)
            HTMLOutput.showError("Number of buckets can't be less or equal to 0.");

        return this.customWindowFunction(alias, arr => {
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

    lead(columnName, offset = 1, alias = "", defaultValue = null) {
        alias ||= `lead_${offset}_${columnName}`;

        return this.customWindowFunction(alias, arr => {
            for (let i = 0; i < arr.length; i++) {
                const leadIndex = i + offset;
                if (leadIndex >= arr.length)
                    arr[i][alias] = defaultValue;
                else
                    arr[i][alias] = arr[leadIndex][columnName];
            }
        });
    }

    lag(columnName, offset = 1, alias = "", defaultValue = null) {
        alias ||= `lag_${offset}_${columnName}`;

        return this.customWindowFunction(alias, arr => {
            for (let i = 0; i < arr.length; i++) {
                const leadIndex = i - offset;
                if (leadIndex < 0)
                    arr[i][alias] = defaultValue;
                else
                    arr[i][alias] = arr[leadIndex][columnName];
            }
        });
    }

    // AGGREGATIONAL FUNCTIONS

    /**
     * returns section of the array [index-startOffset, ..., index+endOffset].
     * stays between range of array [0, ..., array.length-1]
     * @param {Array} arr
     * @param {Number} index
     * @param {Number} startOffset
     * @param {Number} endOffset
     * @returns array [index-startOffset, ..., index+endOffset]
     */
    static getArraySubSection(arr, index, startOffset, endOffset) {
        const startIndex = Math.max(0, index - startOffset),
            endIndex = Math.min(arr.length, index + endOffset + 1);
        return arr.slice(startIndex, endIndex);
    }

    /**
     * sets the count window function for windowing.
     * supports rows between, provide both if any required.
     * supports null or undefined data skipping.
     * @param {String} columnName column name on which aggregation is to applied
     * @param {String} alias alias for new column. undefined/null will set it to a default value
     * @param {Number} startOffset positive number which acts as begining of sliding window
     * @param {Number} endOffset positive number which acts as ending of sliding window
     * @returns pre-defined count window function
     */
    count(columnName, alias, startOffset, endOffset) {
        let countFunc = arr => arr.length;
        if (columnName === undefined || columnName === null || columnName === "")
            alias ||= `count_all`;
        else {
            alias ||= `count_${columnName}`;
            countFunc = arr => arr.filter(item => item[columnName] !== undefined && item[columnName] !== null).length;
        }

        if (startOffset === undefined && endOffset === undefined) {
            return this.customWindowFunction(alias, arr => {
                const len = countFunc(arr);
                arr.forEach(item => item[alias] = len);
            });
        }
        else {
            if (typeof startOffset !== 'number' || typeof endOffset !== 'number')
                HTMLOutput.showError(`Neither of start-offset:${startOffset} or end-offset:${endOffset} can be non-numerical.`)
            if (startOffset < 0 || endOffset < 0)
                HTMLOutput.showError(`Neither of start offset:${startOffset} or end offset:${endOffset} can be less than 0.`)

            return this.customWindowFunction(alias, arr => {
                for (let i = 0; i < arr.length; i++)
                    arr[i][alias] = countFunc(WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset));
            });
        }
    }

    /**
     * sets the sum window function for windowing.
     * supports rows between, provide both if any required.
     * works for numerical type data only.
     * supports null or undefined data skipping.
     * @param {String} columnName column name on which aggregation is to applied
     * @param {String} alias alias for new column. undefined/null will set it to a default value
     * @param {Number} startOffset positive number which acts as begining of sliding window
     * @param {Number} endOffset positive number which acts as ending of sliding window
     * @returns pre-defined sum window function
     */
    sum(columnName, alias, startOffset, endOffset) {
        alias ||= `sum_${columnName}`;
        const sumFunction = arr => arr.reduce((acc, elm) => {
            const val = elm[columnName];
            if (val === undefined || val === null)
                return acc;
            if (typeof val !== 'number')
                HTMLOutput.showError(`'${columnName}' has non-numerical data for sum: ${val}`);
            return acc + elm[columnName];
        }, 0);

        if (startOffset === undefined && endOffset === undefined) {
            return this.customWindowFunction(alias, arr => {
                const total = sumFunction(arr)
                arr.forEach(item => item[alias] = total);
            });
        }
        else {
            if (typeof startOffset !== 'number' || typeof endOffset !== 'number')
                HTMLOutput.showError(`Neither of start-offset:${startOffset} or end-offset:${endOffset} can be non-numerical.`)
            if (startOffset < 0 || endOffset < 0)
                HTMLOutput.showError(`Neither of start offset:${startOffset} or end offset:${endOffset} can be less than 0.`)

            return this.customWindowFunction(alias, arr => {
                for (let i = 0; i < arr.length; i++) {
                    const copiedArr = WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset);
                    arr[i][alias] = sumFunction(copiedArr);
                }
            });
        }
    }

    /**
     * sets the average window function for windowing.
     * supports rows between, provide both if any required.
     * works for numerical type data only.
     * supports null or undefined data skipping.
     * @param {String} columnName column name on which aggregation is to applied
     * @param {String} alias alias for new column. undefined/null will set it to a default value
     * @param {Number} startOffset positive number which acts as begining of sliding window
     * @param {Number} endOffset positive number which acts as ending of sliding window
     * @returns pre-defined average window function
     */
    avg(columnName, alias, startOffset, endOffset) {
        alias ||= `avg_${columnName}`;
        const avgFunction = arr => {
            let len = 0;
            const total = arr.reduce((acc, elm) => {
                const val = elm[columnName];
                if (val === undefined || val === null)
                    return acc;
                if (typeof val !== 'number')
                    HTMLOutput.showError(`'${columnName}' has non-numerical data for sum: ${val}`);
                len++;
                return acc + elm[columnName];
            }, 0);
            return total / len;
        }

        if (startOffset === undefined && endOffset === undefined) {
            return this.customWindowFunction(alias, arr => {
                const avg = avgFunction(arr);
                arr.forEach(item => item[alias] = avg);
            });
        }
        else {
            if (typeof startOffset !== 'number' || typeof endOffset !== 'number')
                HTMLOutput.showError(`Neither of start-offset:${startOffset} or end-offset:${endOffset} can be non-numerical.`)
            if (startOffset < 0 || endOffset < 0)
                HTMLOutput.showError(`Neither of start offset:${startOffset} or end offset:${endOffset} can be less than 0.`)

            return this.customWindowFunction(alias, arr => {
                for (let i = 0; i < arr.length; i++) {
                    const copiedArr = WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset);
                    arr[i][alias] = avgFunction(copiedArr);
                }
            });
        }
    }

    /**
    * sets the maximum window function for windowing.
    * supports rows between, provide both if any required.
    * supports null or undefined data skipping.
    * @param {String} columnName column name on which aggregation is to applied
    * @param {String} alias alias for new column. undefined/null will set it to a default value
    * @param {Number} startOffset positive number which acts as begining of sliding window
    * @param {Number} endOffset positive number which acts as ending of sliding window
    * @returns pre-defined maximum window function
    */
    max(columnName, alias, startOffset, endOffset) {
        alias ||= `max_${columnName}`;
        const maxFunction = arr => {
            arr = arr.filter(elm => elm[columnName] !== undefined && elm[columnName] !== null);
            let comparatorFunc = null;
            if ((typeof arr[0][columnName]) === "number" || arr[0][columnName] instanceof Date)
                comparatorFunc = (a, b) => a > b ? a : b;
            else
                comparatorFunc = (a, b) => (a?.toString()).localeCompare(b?.toString()) > 0 ? a : b;
            return arr.reduce((acc, elm) => comparatorFunc(acc, elm[columnName]), arr[0][columnName]);
        };

        if (startOffset === undefined && endOffset === undefined) {
            return this.customWindowFunction(alias, arr => {
                const maxVal = maxFunction(arr);
                arr.forEach(item => item[alias] = maxVal);
            });
        }
        else {
            if (typeof startOffset !== 'number' || typeof endOffset !== 'number')
                HTMLOutput.showError(`Neither of start-offset:${startOffset} or end-offset:${endOffset} can be non-numerical.`)
            if (startOffset < 0 || endOffset < 0)
                HTMLOutput.showError(`Neither of start offset:${startOffset} or end offset:${endOffset} can be less than 0.`)

            return this.customWindowFunction(alias, arr => {
                for (let i = 0; i < arr.length; i++) {
                    const copiedArr = WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset);
                    arr[i][alias] = maxFunction(copiedArr);
                }
            });
        }
    }

    /**
    * sets the minimum window function for windowing.
    * supports rows between, provide both if any required.
    * supports null or undefined data skipping.
    * @param {String} columnName column name on which aggregation is to applied
    * @param {String} alias alias for new column. undefined/null will set it to a default value
    * @param {Number} startOffset positive number which acts as begining of sliding window
    * @param {Number} endOffset positive number which acts as ending of sliding window
    * @returns pre-defined minimum window function
    */
    min(columnName, alias, startOffset, endOffset) {
        alias ||= `min_${columnName}`;
        const minFunction = arr => {
            arr = arr.filter(elm => elm[columnName] !== undefined && elm[columnName] !== null);
            let comparatorFunc = null;
            if ((typeof arr[0][columnName]) === "number" || arr[0][columnName] instanceof Date)
                comparatorFunc = (a, b) => a < b ? a : b;
            else
                comparatorFunc = (a, b) => (a?.toString()).localeCompare(b?.toString()) < 0 ? a : b;
            return arr.reduce((acc, elm) => comparatorFunc(acc, elm[columnName]), arr[0][columnName]);
        };

        if (startOffset === undefined && endOffset === undefined) {
            return this.customWindowFunction(alias, arr => {
                const minVal = minFunction(arr);
                arr.forEach(item => item[alias] = minVal);
            });
        }
        else {
            if (typeof startOffset !== 'number' || typeof endOffset !== 'number')
                HTMLOutput.showError(`Neither of start-offset:${startOffset} or end-offset:${endOffset} can be non-numerical.`)
            if (startOffset < 0 || endOffset < 0)
                HTMLOutput.showError(`Neither of start offset:${startOffset} or end offset:${endOffset} can be less than 0.`)

            return this.customWindowFunction(alias, arr => {
                for (let i = 0; i < arr.length; i++) {
                    const copiedArr = WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset);
                    arr[i][alias] = minFunction(copiedArr);
                }
            });
        }
    }

    // VALUE ACCESS FUNCTIONS

    nthValue(columnName, n, alias, startOffset, endOffset) {
        n--;
        if (n < 0)
            HTMLOutput.showError(`For nth_value 'n' cannot be less than 1. Provided ${n + 1}`)

        alias ||= `nth_${columnName}`;
        const nthVal = arr => (n >= arr.length) ? null : arr[n][columnName];

        if (startOffset === undefined && endOffset === undefined) {
            return this.customWindowFunction(alias, arr => {
                const minVal = nthVal(arr);
                arr.forEach(item => item[alias] = minVal);
            });
        }
        else {
            if (typeof startOffset !== 'number' || typeof endOffset !== 'number')
                HTMLOutput.showError(`Neither of start-offset:${startOffset} or end-offset:${endOffset} can be non-numerical.`)
            if (startOffset < 0 || endOffset < 0)
                HTMLOutput.showError(`Neither of start offset:${startOffset} or end offset:${endOffset} can be less than 0.`)

            return this.customWindowFunction(alias, arr => {
                for (let i = 0; i < arr.length; i++) {
                    const copiedArr = WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset);
                    arr[i][alias] = nthVal(copiedArr);
                }
            });
        }
    }

    firstValue(columnName, alias, startOffset, endOffset) {
        return this.nthValue(columnName, 1, alias || `first_${columnName}`, startOffset, endOffset);
    }

    lastValue(columnName, alias, startOffset, endOffset) {
        alias ||= `last_${columnName}`;
        const lastVal = arr => arr[arr.length - 1][columnName];

        if (startOffset === undefined && endOffset === undefined) {
            return this.customWindowFunction(alias, arr => {
                const minVal = lastVal(arr);
                arr.forEach(item => item[alias] = minVal);
            });
        }
        else {
            if (typeof startOffset !== 'number' || typeof endOffset !== 'number')
                HTMLOutput.showError(`Neither of start-offset:${startOffset} or end-offset:${endOffset} can be non-numerical.`)
            if (startOffset < 0 || endOffset < 0)
                HTMLOutput.showError(`Neither of start offset:${startOffset} or end offset:${endOffset} can be less than 0.`)

            return this.customWindowFunction(alias, arr => {
                for (let i = 0; i < arr.length; i++) {
                    const copiedArr = WindowingGenerator.getArraySubSection(arr, i, startOffset, endOffset);
                    arr[i][alias] = lastVal(copiedArr);
                }
            });
        }
    }

    // REMOVED: ROWS_BETWEEN THING, IMPLEMENTED IT IN DEFAULT FUNCTIONS AS THEIR PARAMETER
    // TODO: CHECK WHERE REPETATION CAN BE STOPPED
}
