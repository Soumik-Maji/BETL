import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function sort(arr, { comparisonLogics }) {
    const __sortCache__ = Symbol("sortCache");

    arr.forEach(obj => {
        obj[__sortCache__] = comparisonLogics.map(({ column, transformationFunction }) => transformationFunction(obj[column]));
    });

    arr.sort((a, b) => {
        const aVals = a[__sortCache__],
            bVals = b[__sortCache__],
            len = comparisonLogics.length;

        for (let i = 0; i < len; i++) {
            const { dir } = comparisonLogics[i];
            const aVal = aVals[i], bVal = bVals[i];

            // Handle null/undefined first
            if (aVal == null && bVal == null) continue;  // Both null/undefined, try next rule
            if (aVal == null) return -dir;  // Nulls sort to end (or start if desc)
            if (bVal == null) return dir;

            // Type check (optional but safer)
            if (typeof aVal !== typeof bVal) {
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

    return arr;
}

// --------------- Configuration Object creator for sorting ---------------

const constructorKey = Symbol("SortLogicGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for Sorting.
 * Then chain the asc() & desc() methods to create what sorting order is requried.
 * asc() & desc() both accepts 2 arguments the column name & an optional temprary transformation function on which the sorting happens.
 *
 * Like if a column has string data & you need to sort it by it's length
 * but don't want to store the length in a new column then use the temporary function to achieve it temporarily
 *
 * asc & desc have dynamically generated static verions as well. Example call -
 * SortLogicGenerator.asc(...).desc(...).desc(...)
 */
export class SortLogicGenerator {
    #logics;    // to store the sorting configuration

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize SortLogicGenerator using 'new'. Call static methods asc() & desc() instead.");

        this.#logics = [];
    }

    static {
        ["asc", "desc"].forEach(method => {
            SortLogicGenerator[method] = function (column, transformationFunction) {
                const obj = new SortLogicGenerator(constructorKey);
                return obj[method](column, transformationFunction);
            }
        });
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
