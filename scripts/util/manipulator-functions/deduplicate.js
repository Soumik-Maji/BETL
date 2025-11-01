import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function deduplicate(arr, { deduplicationConfig }) {
    const { columns, resolveFunction } = deduplicationConfig;

    let keyForCheck = null;
    const uniques = new Map(), len = arr.length;
    if (len === 0) {
        console.warn("Empty array sent for deduplication.");
        return [];
    }

    for (let i = 0; i < len; i++) {
        const item = arr[i];
        const key = JSON.stringify(columns.map(col => item[col]));
        keyForCheck = key;      // storing to fetch later for proxy check
        if (!uniques.has(key))
            uniques.set(key, []);
        uniques.get(key).push(item);
    }

    // validating the resolve function for illegal operations
    resolveFunction(JsonModifier.arrayOfObjectsProxy(uniques.get(keyForCheck)));

    const newData = [];
    for (const value of uniques.values()) {
        const resolvedRow = resolveFunction(value);

        if (!resolvedRow || typeof resolvedRow !== "object" || Array.isArray(resolvedRow))
            throw new Error("Resolve function must return a single object");

        if (!value.includes(resolvedRow))
            throw new Error("Resolve function must return an unmodified row from the duplicate group");

        newData.push(resolvedRow);
    }
    return newData;
}

// --------------- Configuration Object creator for deduplication ---------------

const constructorKey = Symbol("DeduplicateGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for Deduplicating.
 * Call static method setDeduplicatingColumns() with columns to deduplicate (spread operator syntax) for creating a instance of this class.
 * Then chain setResolveFunction() or it's predefined implementations (max, min, last, default is first) method to specify which row to keep.
 */
export class DeduplicateGenerator {

    #columns;   // columns on which the deduplication is done
    #resolveFunction;   // function based on which deduplicated value is returned
    #isResolveSet;

    constructor(passedKey) {
        if (passedKey !== constructorKey)
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

        const tmpObj = new DeduplicateGenerator(constructorKey);
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
                if (cellValue === undefined || cellValue === null)
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
                if (cellValue === undefined || cellValue === null)
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
