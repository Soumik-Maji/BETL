import { ObjectArray } from "../../ObjectArray.js";
import { DataTypes, validateColumnPresence, validateDataType } from "../ParameterValidator.js";

export function append(arr, { appendRelations, currentColumns }) {
    const { source, relations } = appendRelations;
    const srcLength = source.length, relationsLength = relations.length;

    const targetDataStructure = {};
    currentColumns.forEach(key => targetDataStructure[key] = null);

    for (let i = 0; i < srcLength; i++) {
        const row = source[i], newRow = { ...targetDataStructure };

        for (let j = 0; j < relationsLength; j++) {
            const relation = relations[j];
            newRow[relation.tgt] = row[relation.src];
        }
        arr.push(newRow);
    }

    return arr;
}

// --------------- Configuration Object creator for mapping ---------------

const constructorKey = Symbol("AppendGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for Appending/ Mapping.
 * More flexible version of union, where source & target tables can have different table structures.
 * Call static method setSource() with source ObjectArray instance for creating a instance of this class.
 * Then chain the set() method to set which source column needs to be mapped to which target column.
 */
export class AppendGenerator {
    #source;        // another ObjectArray instance from which source column data is taken
    #relations;     // to store source & target column names in array of objects format
    #srcColumns;    // this is for storing the source's columns for fast look up validation

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize AppendGenerator using 'new'. Call static method setSource() instead.");

        this.#source = null;
        this.#relations = [];
        this.#srcColumns = null;
    }

    /**
     * create mapper & set the source object of mapper
     * @param {ObjectArray} src
     * @returns {AppendGenerator}
     */
    static setSource(src) {
        if (!(src instanceof ObjectArray))
            throw new Error("Source must be an ObjectArray instance.");

        const tmpObj = new AppendGenerator(constructorKey);
        const resolved = src.execute();     // resolve the pipeline before proceeding to map it to target
        tmpObj.#srcColumns = resolved.columns;
        tmpObj.#source = resolved.readOnlyData;     // setting up source to be data directly
        return tmpObj;
    }

    /**
     * creates the relation between the target & source columns
     * @param {string} tgtCol target column name
     * @param {string} srcCol source column name
     * @returns {AppendGenerator}
     */
    set(tgtCol, srcCol) {
        validateDataType(tgtCol, DataTypes.string);
        validateDataType(srcCol, DataTypes.string);

        if (this.#relations.some(item => item.tgt === tgtCol))
            throw new Error(`Cannot use target column '${tgtCol}' more than once.`);

        validateColumnPresence(this.#srcColumns, srcCol, "This column was not found in the source provied to mapping generator.");

        this.#relations.push(Object.freeze({
            tgt: tgtCol,
            src: srcCol
        }));
        return this;
    }

    /**
     * make source & relations immutable & return
     * @returns immutable mapping configuration
     */
    build() {
        if (this.#relations.length === 0)
            throw new Error("There is no column mapping present.");

        return Object.freeze({
            source: this.#source,
            relations: Object.freeze(this.#relations)
        });
    }
}
