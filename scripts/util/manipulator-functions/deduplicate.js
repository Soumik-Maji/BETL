import { privateConstructorKey } from "../../ObjectArray.js"
import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function deduplicate(arr, { deduplicationConfig }) {
    const { columns, resolveFunction } = deduplicationConfig;

    const len = arr.length;
    if (len === 0)
        return [];

    const colLen = columns.length;
    const uniques = new Map();
    for (let i = 0; i < len; i++) {
        const item = arr[i];
        // building key
        let key = "";
        for (let j = 0; j < colLen; j++)
            key += (j ? "\u0001" : "") + item[columns[j]];

        let group = uniques.get(key);
        if (!group) {
            group = [];
            uniques.set(key, group);
        }
        group.push(item);
    }

    const keyForCheck = uniques.keys().next().value;    // get the first key
    // validating the resolve function for illegal operations
    resolveFunction(JsonModifier.arrayOfObjectsProxy(uniques.get(keyForCheck)));

    let writeIndex = 0;
    for (const value of uniques.values()) {
        const resolvedRow = resolveFunction(value);

        if (!resolvedRow || typeof resolvedRow !== "object" || Array.isArray(resolvedRow))
            throw new Error("Resolve function must return a single object");

        if (!value.includes(resolvedRow))
            throw new Error("Resolve function must return an unmodified row from the duplicate group");

        arr[writeIndex++] = resolvedRow;
    }
    arr.length = writeIndex;
    return arr;
}

// --------------- Configuration Object creator for deduplication ---------------
/**
 * This class generates the configuration object for Deduplicating.
 * Call static method setDeduplicatingColumns() with columns to deduplicate (spread operator syntax) for creating a instance of this class.
 * Then OPTIONALLY chain setResolveFunction() or it's convenience wrappers max, min, last (default is first) method to specify which row to keep.
 */
export class DeduplicateGenerator {

    #columns;   // columns on which the deduplication is done
    #resolveFunction;   // function based on which deduplicated value is returned
    #isResolveSet;

    constructor(passedKey) {
        if (passedKey !== privateConstructorKey)
            throw new Error("Cannot initialize DeduplicateGenerator using 'new'. Call static method setDeduplicatingColumns() instead.");

        this.#columns = [];
        this.#resolveFunction = item => item[0];
        this.#isResolveSet = false;
    }

    /**
     * sets the columns on which deduplication needs to be done. default return row is first.
     * @param  {...any} columns
     * @returns {DeduplicateGenerator}
     */
    static setDeduplicatingColumns(...columns) {
        columns.forEach(col => validateDataType(col, DataTypes.string));

        const tmpObj = new DeduplicateGenerator(privateConstructorKey);
        tmpObj.#columns = [...(new Set(columns))];
        return tmpObj;
    }

    /**
     * set the resolve function by which specific unqiue row is returned. default is first row.
     * @param {Function} resolveFunction
     * @returns {DeduplicateGenerator}
     */
    setResolveFunction(resolveFunction) {
        if (this.#isResolveSet)
            throw new Error("Cannot set resolve function more than once in DeduplicateGenerator.");
        validateDataType(resolveFunction, DataTypes.function);

        this.#resolveFunction = resolveFunction;
        this.#isResolveSet = true;
        return this;
    }

    /**
     * make deduplication data immutable & return
     * @returns immutable deduplication data
     */
    build() {
        return Object.freeze({
            columns: this.#columns,
            resolveFunction: this.#resolveFunction
        });
    }

    // ---------------------- Convenience Wrappers ----------------------
    // May have strange quirks of JavaScript's type system.

    /**
     * returns the maximum of the duplication group
     * @param {String} columnName
     * @returns {DeduplicateGenerator} maximum deduplicated row
     */
    max(columnName) {
        return this.setResolveFunction(arr => {
            let maxItem = null, comparatorFunc = null;
            const len = arr.length;

            for (let i = 0; i < len; i++) {
                const cellValue = arr[i][columnName];
                if (cellValue === undefined || cellValue === null || Number.isNaN(cellValue))
                    continue;

                if (comparatorFunc === null) {
                    if ((typeof cellValue) === "number" || cellValue instanceof Date)
                        comparatorFunc = (a, b) => a[columnName] > b[columnName] ? a : b;
                    else
                        comparatorFunc = (a, b) => (a[columnName].toString()).localeCompare(b[columnName].toString()) > 0 ? a : b;

                    maxItem = arr[i];
                    continue;
                }
                maxItem = comparatorFunc(maxItem, arr[i]);
            }
            return maxItem ?? arr[0];
        });
    }

    /**
     * returns the minimum of the duplication group
     * @param {String} columnName
     * @returns {DeduplicateGenerator} minimum deduplicated row
     */
    min(columnName) {
        return this.setResolveFunction(arr => {
            let minItem = null, comparatorFunc = null;
            const len = arr.length;

            for (let i = 0; i < len; i++) {
                const cellValue = arr[i][columnName];
                if (cellValue === undefined || cellValue === null || Number.isNaN(cellValue))
                    continue;

                if (comparatorFunc === null) {
                    if ((typeof cellValue) === "number" || cellValue instanceof Date)
                        comparatorFunc = (a, b) => a[columnName] < b[columnName] ? a : b;
                    else
                        comparatorFunc = (a, b) => (a[columnName].toString()).localeCompare(b[columnName].toString()) < 0 ? a : b;

                    minItem = arr[i];
                    continue;
                }
                minItem = comparatorFunc(minItem, arr[i]);
            }
            return minItem ?? arr[0];
        });
    }

    /**
     * @returns {DeduplicateGenerator} last row of the deduplication group
     */
    last() {
        return this.setResolveFunction(arr => arr[arr.length - 1]);
    }
}
