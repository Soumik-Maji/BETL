import { HTMLOutput } from "../outputs/HTMLOutput.js";

export class GroupingGenerator {

    static #isConstructorLocked = true;    // lock constructor to make it act like a private constructor

    #columns;   // columns on which the grouping is done
    #logics;    // array which contains the logics for aggregation
    constructor() {
        if (GroupingGenerator.#isConstructorLocked)
            HTMLOutput.showError("Cannot call GroupingGenerator with 'new'. Call static function setGroupingColumns().");
        this.#columns = [];
        this.#logics = [];
        GroupingGenerator.#isConstructorLocked = true;
    }

    /**
     * create group & set the grouping columns of group
     * @param  {...string} columnNames
     * @returns GroupingGenerator instance
     */
    static setGroupingColumns(...columnNames) {
        GroupingGenerator.#isConstructorLocked = false;
        const tmpObj = new GroupingGenerator();
        tmpObj.#columns = [...(new Set(columnNames))];
        return tmpObj;
    }

    /**
     * cumulatively generates the logic for grouping
     * @param {string} columnName
     * @param {string} alias
     * @param {function} aggregationFunction
     */
    customAggregator(columnName, alias, aggregationFunction) {
        this.#logics.push(Object.freeze({
            column: columnName,
            aggFunc: aggregationFunction,
            alias
        }));
        return this;
    }

    /**
     * make logics immutable & return
     * @returns immutable logics
     */
    build() {
        this.#logics = Object.freeze(this.#logics);
        return Object.freeze({
            groupingColumns: this.#columns,
            logics: this.#logics
        });
    }

    // NOTE: below are some widely used aggregator functions.
    // May have strange quirks of JavaScript's type system.

    /**
     * creates count aggregator for you
     * @param {string} columnName
     * @param {string} [alias]
     */
    count(columnName, alias) {
        let ignore = true;
        let aggFunc = arr => arr.length;
        if (columnName === undefined || columnName === null || columnName === "")
            alias ||= "count_all";
        else {
            ignore = false;
            alias ||= `count_${columnName}`;
            aggFunc = arr => arr.filter(item => item !== undefined && item !== null).length;
        }
        this.#logics.push({
            column: columnName,
            aggFunc,
            alias,
            ignore  // to not check column name presence in count() function this is required. cannot be set by others.
        });
        return this;
    }

    /**
     * creates sum aggregator for you
     * @param {string} columnName
     * @param {string} [alias]
     */
    sum(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias || `sum_${columnName}`,
            arr => {
                let total = 0;
                for (const elm of arr) {
                    if (elm === undefined || elm === null)
                        continue;
                    else if (typeof elm === "number")
                        total += elm;
                    else
                        HTMLOutput.showError(`${columnName} has non-numerical data for sum: ${elm}`);
                }
                return total;
            }
        );
    }

    /**
     * creates average aggregator for you
     * @param {string} columnName
     * @param {string} [alias]
     */
    avg(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias || `avg_${columnName}`,
            arr => {
                let total = 0, len = 0;
                for (const elm of arr) {
                    if (elm === undefined || elm === null)
                        continue;
                    else if (typeof elm === "number") {
                        total += elm;
                        len++;
                    }
                    else
                        HTMLOutput.showError(`${columnName} has non-numerical data for average: ${elm}`);
                }
                return total / len;
            }
        );
    }

    /**
     * creates maximum aggregator for you
     * @param {string} columnName
     * @param {string} [alias]
     */
    max(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias || `max_${columnName}`,
            arr => {
                arr = arr.filter(elm => elm !== undefined && elm !== null);
                let comparatorFunc = null;
                if ((typeof arr[0]) === "number" || arr[0] instanceof Date)
                    comparatorFunc = (a, b) => a > b ? a : b;
                else
                    comparatorFunc = (a, b) => (a?.toString()).localeCompare(b?.toString()) > 0 ? a : b;
                return arr.reduce((acc, elm) => comparatorFunc(acc, elm), arr[0]);
            }
        );
    }

    /**
     * creates minimum aggregator for you
     * @param {string} columnName
     * @param {string} [alias]
     */
    min(columnName, alias) {
        return this.customAggregator(
            columnName,
            alias || `min_${columnName}`,
            arr => {
                arr = arr.filter(elm => elm !== undefined && elm !== null);
                let comparatorFunc = null;
                if ((typeof arr[0]) === "number" || arr[0] instanceof Date)
                    comparatorFunc = (a, b) => a < b ? a : b;
                else
                    comparatorFunc = (a, b) => (a?.toString()).localeCompare(b?.toString()) < 0 ? a : b;
                return arr.reduce((acc, elm) => comparatorFunc(acc, elm), arr[0]);
            }
        );
    }
}
