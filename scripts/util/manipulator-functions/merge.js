import { ObjectArray } from "../../ObjectArray.js";
import { DataTypes, validateColumnPresence, validateDataType } from "../ParameterValidator.js";

const constructorKey = Symbol("MergeGenerator");   // Symbol for object creation via private constructor

export class MergeGenerator {
    #source;
    #matchOnCondition;
    #commandBuffer;         // 2d array to store the series of commands for each condition

    #matchConditionIndex;   // index to command buffer. 0-presentInBoth, 1-presentInSource, 2-presentInTarget
    #whenCondition;         // temporarily store the when condition for conditional insert, update, delete
    #sourceColumns;         // stores the column names of the source table

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize MergeGenerator using 'new'. Call static method source() instead.");

        this.#source = null;
        this.#sourceColumns = null;
        this.#matchOnCondition = null;
        this.#commandBuffer = [[], [], []];
        this.#matchConditionIndex = null;
        this.#whenCondition = null;
    }

    static source(source, matchOnCondition) {
        if (!(source instanceof ObjectArray))
            throw new Error("Source must instance of ObjectArray");
        validateDataType(matchOnCondition, DataTypes.function, "Match On condition for merge needs to be a function");

        const tmpObj = new MergeGenerator(constructorKey);
        const resolvedSource = source.execute();
        tmpObj.#source = resolvedSource.readOnlyData;
        tmpObj.#sourceColumns = resolvedSource.columns;
        tmpObj.#matchOnCondition = matchOnCondition;
        return tmpObj;
    }

    presentInBoth() {       // 0 - when matched
        this.#matchConditionIndex = 0;
        this.#whenCondition = null;
        return this;
    }
    presentInSource() {     // 1 - when not matched
        this.#matchConditionIndex = 1;
        this.#whenCondition = null;
        return this;
    }
    presentInTarget() {     // 2 - when not matched by source
        this.#matchConditionIndex = 2;
        this.#whenCondition = null;
        return this;
    }

    when(condition) {
        validateDataType(condition, DataTypes.function, "When condition in merge contexts needs to be a function");
        this.#whenCondition = condition;
        return this;
    }

    resetWhenCondition() {
        this.#whenCondition = null;
        return this;
    }

    #validateArguments(targetColumn, unresolvedValue) {
        if (targetColumn !== undefined) {
            validateDataType(targetColumn, DataTypes.string, "Target column name should be a string.");
            if (typeof unresolvedValue === "string") {
                validateColumnPresence(this.#sourceColumns, unresolvedValue,
                    "Source table does not have the provided column. For Literal strings pass function returning it.");
            }
            else
                validateDataType(unresolvedValue, DataTypes.function, "Can pass only source table column name or function to compute the value.");
        }
        else if (targetColumn === undefined && unresolvedValue !== undefined)
            throw new Error("If target column in merge is undefined then leave unresolvedValue as undefined to allow operation on all columns.");
    }

    #addCommand(type, targetColumn, value, condition) {
        if (this.#matchConditionIndex === null)
            throw new Error("Must call presentInBoth/Source/Target before adding operations.");

        this.#commandBuffer[this.#matchConditionIndex].push({
            type,
            targetColumn: targetColumn ?? null,
            value: value ?? null,
            condition
        });
        return this;
    }

    insert(targetColumn, unresolvedValue) {
        this.#validateArguments(targetColumn, unresolvedValue);
        return this.#addCommand("insert", targetColumn, unresolvedValue, this.#whenCondition);  // put input into this
    }

    update(targetColumn, unresolvedValue) {
        this.#validateArguments(targetColumn, unresolvedValue);
        return this.#addCommand("update", targetColumn, unresolvedValue, this.#whenCondition);  // put input into this
    }

    delete() {
        return this.#addCommand("delete", null, null, this.#whenCondition);  // put input into this
    }

    build() {
        this.#commandBuffer.forEach(commandArray => {
            commandArray.forEach(cmd => Object.freeze(cmd));
            Object.freeze(commandArray);
        });

        return Object.freeze({
            source: this.#source,
            matchOnCondition: this.#matchOnCondition,
            commandBuffer: Object.freeze(this.#commandBuffer)
        });
    }
}
