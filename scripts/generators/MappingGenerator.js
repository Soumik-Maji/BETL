import { ObjectArray } from "../jsoar/ObjectArray.js";
import { HTMLOutput } from "../outputs/HTMLOutput.js";

export class MappingGenerator {

    static #isConstructorLocked = true;    // lock constructor to make it act like a private constructor

    #source;        // another ObjectArray instance from which source column data is taken
    #relations;     // to store source & target column names in array of objects format
    constructor() {
        if (MappingGenerator.#isConstructorLocked)
            HTMLOutput.showError("Cannot call MappingGenerator with 'new'. Call static function setSource().");
        this.#source = null;
        this.#relations = [];
        MappingGenerator.#isConstructorLocked = true;
    }

    /**
     * create mapper & set the source object of mapper
     * @param {ObjectArray} src
     * @returns MappingGenerator instance
     */
    static setSource(src) {
        MappingGenerator.#isConstructorLocked = false;
        const tmpObj = new MappingGenerator();
        tmpObj.#source = src;
        return tmpObj;
    }

    /**
     * creates the relation between the target & source columns
     * @param {string} tgtCol target column name
     * @param {string} srcCol source column name
     */
    relate(tgtCol, srcCol) {
        if (this.#relations.some(item => item.tgt === tgtCol))
            HTMLOutput.showError(`Cannot use target column '${tgtCol}' more than once.`);

        this.#relations.push(Object.freeze({
            tgt: tgtCol,
            src: srcCol
        }));
        return this;
    }

    /**
     * @returns immutable source & column name array
     */
    build() {
        return Object.freeze({
            source: this.#source,
            relations: Object.freeze(this.#relations)
        });
    }
}
