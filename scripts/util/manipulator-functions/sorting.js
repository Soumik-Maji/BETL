import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function sort(arr, { comparisonLogics }) {
    const __sortCache__ = Symbol("sortCache");

    arr.forEach(obj => {
        obj[__sortCache__] = comparisonLogics.map(({ column, transformationFunction }) => transformationFunction(obj[column]));
    });

    arr.sort((a, b) => {
        const aVals = a[__sortCache__], bVals = b[__sortCache__];

        for (let i = 0; i < comparisonLogics.length; i++) {
            const { dir } = comparisonLogics[i];
            const aVal = aVals[i], bVal = bVals[i];

            // Handle null/undefined first
            if (aVal == null && bVal == null) continue;  // Both null/undefined, try next rule
            if (aVal == null) return -dir;  // Nulls sort to end (or start if desc)
            if (bVal == null) return dir;

            // Type check (optional but safer)
            if (typeof aVal !== typeof bVal) {
                // console.warn(`Type mismatch in column '${column}': ${typeof aVal} vs ${typeof bVal}`);
                // Fallback: convert both to strings for comparison
                const comparison = String(aVal).localeCompare(String(bVal));
                if (comparison !== 0)
                    return dir * comparison;
                continue;
            }

            // String comparison
            if (typeof aVal === "string") {
                const comparison = aVal.localeCompare(bVal);
                if (comparison !== 0)
                    return dir * comparison;
            }
            // Number comparison
            else if (typeof aVal === "number") {
                if (isNaN(aVal) && isNaN(bVal)) continue;  // Both NaN, try next rule
                if (isNaN(aVal)) return -dir;  // NaN sorts to end (or start if desc)
                if (isNaN(bVal)) return dir;

                if (aVal < bVal) return -dir;
                if (aVal > bVal) return dir;
            }
            // Other types (boolean, date, etc.)
            else {
                if (aVal < bVal) return -dir;
                if (aVal > bVal) return dir
            }
        }
        return 0;
    });

    // removing the cache
    arr.forEach(obj => delete obj[__sortCache__]);
}

// --------------- Configuration Object creator for sorting ---------------

const constructorKey = Symbol("SortLogicGenerator");   // Symbol for object creation via private constructor

export class SortLogicGenerator {
    #logics;    // to store the sorting configuration

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize SortLogicGenerator using 'new'. Call static method createInstance() instead.");

        this.#logics = [];
    }

    /**
     * @returns {SortLogicGenerator} new instance of SortLogicGenerator class
     */
    static createInstance() {
        return new SortLogicGenerator(constructorKey);
    }

    /**
     * stacks the configuration objects in logic array for later parsing
     * @param {string} column
     * @param {number} dir
     * @param {Function} transformationFunction
     * @returns {SortLogicGenerator}
     */
    #customSortLogic(column, dir, transformationFunction) {
        validateDataType(column, DataTypes.string);
        validateDataType(transformationFunction, DataTypes.function);

        if (this.#logics.some(item => item.column === column))
            throw new Error(`Cannot sort on column ${column} twice.`);

        this.#logics.push(Object.freeze({ column, dir, transformationFunction }));
        return this;
    }

    /**
     * to sort in ascending order, can send temporary transformation function to be applied before sorting
     * @param {string} column
     * @param {Function} transformationFunction
     * @returns {SortLogicGenerator}
     */
    asc(column, transformationFunction = item => item) {
        return this.#customSortLogic(column, 1, transformationFunction);
    }

    /**
      * to sort in descending order, can send temporary transformation function to be applied before sorting
      * @param {string} column
      * @param {Function} transformationFunction
      * @returns {SortLogicGenerator}
      */
    desc(column, transformationFunction = item => item) {
        return this.#customSortLogic(column, -1, transformationFunction);
    }

    /**
     * make logics immutable & return
     * @returns immutable sorting configuration
     */
    build() {
        return Object.freeze(this.#logics);
    }
}
