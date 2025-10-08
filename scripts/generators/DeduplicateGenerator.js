import { HTMLOutput } from "../outputs/HTMLOutput.js";

export class DeduplicateGenerator {

    static #isConstructorLocked = true;    // lock constructor to make it act like a private constructor

    #columns;   // columns on which the deduplication is done
    #resolveFunction;   // function based on which deduplicated value is returned
    #isResolveSet;
    constructor() {
        if (DeduplicateGenerator.#isConstructorLocked)
            HTMLOutput.showError("Cannot call DeduplicateGenerator with 'new'. Call static function setDeduplicatingColumns().");
        this.#columns = [];
        this.#resolveFunction = item => item[0];
        this.#isResolveSet = false;
        DeduplicateGenerator.#isConstructorLocked = true;
    }

    /**
     * sets the columns on which deduplication needs to be done. default return row is first.
     * @param  {...any} columns
     * @returns DeduplicateGenerator object
     */
    static setDeduplicatingColumns(...columns) {
        DeduplicateGenerator.#isConstructorLocked = false;
        const tmpObj = new DeduplicateGenerator();

        tmpObj.#columns = [...(new Set(columns))];
        return tmpObj;
    }

    /**
     * set the resolve function by which specific unqiue row is returned. default is first row.
     * @param {Function} resolveFunction
     */
    setResolveFunction(resolveFunction) {
        if (this.#isResolveSet)
            HTMLOutput.showError("Cannot set resolve function more than once.");
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
     * @returns maximum deduplicated row
     */
    max(columnName) {
        return this.setResolveFunction(arr => {
            arr = arr.filter(elm => elm[columnName] !== undefined && elm[columnName] !== null);
            let comparatorFunc = null;
            if ((typeof arr[0][columnName]) === "number" || arr[0][columnName] instanceof Date)
                comparatorFunc = (a, b) => a[columnName] > b[columnName] ? a : b;
            else
                comparatorFunc = (a, b) => (a[columnName]?.toString()).localeCompare(b[columnName]?.toString()) > 0 ? a : b;
            return arr.reduce((acc, elm) => comparatorFunc(acc, elm), arr[0]);
        });
    }

    /**
     * returns the minimum of the duplication group
     * @param {String} columnName
     * @returns minimum deduplicated row
     */
    min(columnName) {
        return this.setResolveFunction(arr => {
            arr = arr.filter(elm => elm[columnName] !== undefined && elm[columnName] !== null);
            let comparatorFunc = null;
            if ((typeof arr[0][columnName]) === "number" || arr[0][columnName] instanceof Date)
                comparatorFunc = (a, b) => a[columnName] < b[columnName] ? a : b;
            else
                comparatorFunc = (a, b) => (a[columnName]?.toString()).localeCompare(b[columnName]?.toString()) < 0 ? a : b;
            return arr.reduce((acc, elm) => comparatorFunc(acc, elm), arr[0]);
        });
    }

    /**
     * @returns last row of the deduplication group
     */
    last() {
        return this.setResolveFunction(arr => arr.at(-1));
    }
}
