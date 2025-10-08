import { HTMLOutput } from "../outputs/HTMLOutput.js";

export class SortLogicGenerator {

    static #isConstructorLocked = true;    // lock constructor to make it act like a private constructor

    #logics;
    constructor() {
        if (SortLogicGenerator.#isConstructorLocked)
            HTMLOutput.showError("Cannot call SortLogicGenerator with 'new'. Call static function createInstance().");
        this.#logics = [];
        SortLogicGenerator.#isConstructorLocked = true;
    }

    /**
     * @returns new instance of SortLogicGenerator class
     */
    static createInstance() {
        SortLogicGenerator.#isConstructorLocked = false;
        return new SortLogicGenerator();
    }

    /**
     * stacks the logic objects in logic array for later parsing
     * @param {string} column
     * @param {string} order
     * @param {Function} transformationFunction
     * @returns SortLogicGeneratorInstance
     */
    #customSortLogic(column, order, transformationFunction) {
        if (this.#logics.some(item => item.column === column))
            HTMLOutput.showError(`Cannot sort on column ${column} twice.`);

        this.#logics.push(Object.freeze({ column, order, transformationFunction }));
        return this;
    }

    /**
     * to sort in ascending order, can send temporary transformation function to be applied before sorting
     * @param {string} column
     * @param {Function} transformationFunction
     */
    asc(column, transformationFunction = item => item) {
        return this.#customSortLogic(column, "asc", transformationFunction);
    }

    /**
     * to sort in descending order, can send temporary transformation function to be applied before sorting
     * @param {string} column
     * @param {Function} transformationFunction
     */
    desc(column, transformationFunction = item => item) {
        return this.#customSortLogic(column, "desc", transformationFunction);
    }

    /**
     * make logics immutable & return
     * @returns immutable logics
     */
    build() {
        return Object.freeze(this.#logics);
    }
}
