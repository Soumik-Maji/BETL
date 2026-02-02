import { ObjectArray } from "../../ObjectArray.js";
import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, validateColumnPresence, validateDataType } from "../ParameterValidator.js";

export function merge(target, { source, matchOnCondition, commandBuffer, emptyTargetRow }) {
    const tgtLen = target.length, srcLen = source.length, result = [];

    const tgtCheckRow = tgtLen > 0 ? JsonModifier.objectProxy(target[0]) : null;
    const srcCheckRow = srcLen > 0 ? JsonModifier.objectProxy(source[0]) : null;

    // VALIDATE: match on condition function return type
    if (tgtLen > 0 && srcLen > 0) {
        const moc = matchOnCondition(tgtCheckRow, srcCheckRow);
        validateDataType(moc, DataTypes.boolean, "Match On condition in merge has to return a boolean");
    }

    /*
        REFACTOR NOTICE (commandBuffer): This may need refactoring in if statments.
            Especially the first one as either can be empty resulting in null tgtCheckRow, srcCheckRow.
            Though why would user check for row presenece in both if target is empty in first place.
            I guess to make the code IDIOT PROOF.
            But it'll require someone on either end of the spectrum to mess it up.
    */

    // VALIDATE: all when conditions inside command buffer
    commandBuffer.forEach((commands, ctxIndex) => {
        commands.forEach(cmd => {
            if (cmd.condition) {
                let testResult;
                if (ctxIndex === 0 && tgtLen > 0 && srcLen > 0)     // present in both
                    testResult = cmd.condition(tgtCheckRow, srcCheckRow);
                else if (ctxIndex === 1 && srcLen > 0)              // present in source
                    testResult = cmd.condition(srcCheckRow);
                else if (ctxIndex === 2 && tgtLen > 0)              // present in target
                    testResult = cmd.condition(tgtCheckRow);

                if (testResult !== undefined)
                    validateDataType(testResult, DataTypes.boolean, "when condition in merge contexts needs to be a boolean");
            }
        });
    });

    // MAIN CODE
    const matchedSourceFlags = new Uint8Array(srcLen);  // store the indices of the source rows which did not match any target

    for (let i = 0; i < tgtLen; i++) {
        const tgtRow = target[i];
        let targetMatched = false;

        for (let j = 0; j < srcLen; j++) {
            const srcRow = source[j];

            if (matchOnCondition(tgtRow, srcRow)) {
                if (targetMatched)
                    throw new Error(`Cardinality violation: Multiple source rows matched below target row
                    source row - ${JSON.stringify(srcRow)}
                    target row - ${JSON.stringify(tgtRow)}
                    Ensure source has unique keys for the merge condition.`);

                if (matchedSourceFlags[j] === 1)
                    throw new Error(`Cardinality violation: Source row matched multiple target rows
                    source row - ${JSON.stringify(srcRow)}
                    target row - ${JSON.stringify(tgtRow)}
                    Ensure target has unique keys.`);

                targetMatched = true;
                matchedSourceFlags[j] = 1;

                const updatedRow = applyCommands(tgtRow, srcRow, commandBuffer[0], emptyTargetRow);
                if (updatedRow !== null)
                    result.push(updatedRow);
            }
        }

        if (!targetMatched) {
            const updatedRow = applyCommands(tgtRow, null, commandBuffer[2], emptyTargetRow);
            if (updatedRow !== null)
                result.push(updatedRow);
        }
    }

    for (let i = 0; i < srcLen; i++) {
        if (matchedSourceFlags[i] === 0) {
            const updatedRow = applyCommands(null, source[i], commandBuffer[1], emptyTargetRow);
            if (updatedRow !== null)
                result.push(updatedRow);
        }
    }

    return result;
}

function applyCommands(tRow, sRow, commands, emptyTargetRow) {
    let resultRow = tRow ? { ...tRow } : { ...emptyTargetRow };
    const len = commands.length;
    let commandApplied = false;     // boolean flag to check if any command is applied on the row

    for (let i = 0; i < len; i++) {
        const cmd = commands[i];

        if (cmd.condition) {    // check if when is set then apply as per context
            let conditionMet = false;
            if (tRow !== null && sRow !== null) // context determined via null rows
                conditionMet = cmd.condition(tRow, sRow);
            else if (sRow === null)
                conditionMet = cmd.condition(tRow);
            else if (tRow === null)
                conditionMet = cmd.condition(sRow);

            if (!conditionMet)
                continue;
        }

        commandApplied = true;      // set flag to true in case any command is going to be applied

        if (cmd.type === "delete")  // return null when operation is delete
            return null;

        // in case of insert or update operation
        if (!cmd.checkTargetColumn) {
            if (sRow)
                resultRow = { ...resultRow, ...sRow };
        }
        else {
            let value;
            if (typeof cmd.value === "function") {
                if (tRow !== null && sRow !== null) // context determined via null rows
                    value = cmd.value(tRow, sRow);
                else if (sRow === null)
                    value = cmd.value(tRow);
                else if (tRow === null)
                    value = cmd.value(sRow);
            } else
                value = sRow[cmd.value];

            resultRow[cmd.targetColumn] = value;
        }
    }

    if (!commandApplied)
        return tRow;

    return resultRow;
}


const constructorKey = Symbol("MergeGenerator");   // Symbol for object creation via private constructor
/**
 * This class generates the configuration object for Merging.
 * Use for upsert like operation where the target is modified based on a incoming change data (source).
 * - Call static method source() with source ObjectArray instance & match condition for creating a instance of this class.
 * - Then chain the presentInBoth(), presentInSource(), presentInTarget() methods to set context which is true for a target row.
 * - Then after a context function chain when(), resetWhenCondition(), insert(), update(), delete() to set the
 * operation which needs to be done for target row or any subordinate condition for any operation to take place.
 * Subordinate condition needs to be reset manually if required.
 * @important EXECUTION BEHAVIOR:
 * - All when() conditions are evaluated against ORIGINAL row values, not intermediate changes
 * - Commands execute in the order they are chained
 * - If multiple commands update the same column, the LAST one wins
 * - Example: .when(x).update("col", val1).when(y).update("col", val2) → col gets val2 if both conditions true
 */
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

    /**
     * creates MergeGenerator instance, sets the source object & condition on which target and source rows should match
     * @param {ObjectArray} source
     * @param {function} matchOnCondition Signature: (targetRow, sourceRow) => boolean
     * @returns {MergeGenerator}
     */
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

    /**
     * check for when row is present in both target & source
     * @returns {MergeGenerator}
     */
    presentInBoth() {       // 0 - when matched
        this.#matchConditionIndex = 0;
        this.#whenCondition = null;
        return this;
    }

    /**
     * check for when row is present in source only
     * @returns {MergeGenerator}
     */
    presentInSource() {     // 1 - when not matched
        this.#matchConditionIndex = 1;
        this.#whenCondition = null;
        return this;
    }

    /**
     * check for when row is present in target only
     * @returns {MergeGenerator}
     */
    presentInTarget() {     // 2 - when not matched by source
        this.#matchConditionIndex = 2;
        this.#whenCondition = null;
        return this;
    }

    /**
     * set subordinate condition after context for is for is set declared using presentInBoth/Source/Target.
     * Cannot call without declaring the context first.
     * @param {function} condition
     * @returns {MergeGenerator}
     * @note the function takes arguments based on the context.
     * no error will be thrown in case of wrong NUMBER or ORDER of arguments provided.
     * just logically output will be wrong.
     * - accepts both target & source rows when presentInBoth. target argument first then source.
     * - accepts only target row when presentInTarget.
     * - accepts only source row when presentInSource.
     */
    when(condition) {
        if (this.#matchConditionIndex === null)
            throw new Error("Must call presentInBoth/Source/Target before calling for subordinate conditions.");

        validateDataType(condition, DataTypes.function, "When condition in merge contexts needs to be a function");
        this.#whenCondition = condition;
        return this;
    }

    /**
     * reset subordinate condition if it was set using when().
     * Cannot call without declaring the context or any prior subordinate condition first.
     * @returns {MergeGenerator}
     */
    resetWhenCondition() {
        if (this.#matchConditionIndex === null)
            throw new Error("Must call presentInBoth/Source/Target before calling for subordinate conditions.");
        if (this.#whenCondition === null)
            throw new Error("Subordinate when condition is not set yet.");

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

            return true;
        }
        else if (targetColumn === undefined && unresolvedValue !== undefined)
            throw new Error("If target column in merge is undefined then leave unresolvedValue as undefined to allow operation on all columns.");

        return false;
    }

    #addCommand(type, checkTargetColumn, targetColumn, value, condition) {
        if (this.#matchConditionIndex === null)
            throw new Error("Must call presentInBoth/Source/Target before adding operations.");

        this.#commandBuffer[this.#matchConditionIndex].push({
            type,
            checkTargetColumn,
            targetColumn: targetColumn ?? null,
            value: value ?? null,
            condition
        });
        return this;
    }

    /**
     * insert a complete row or only some rows or a function which resolves to set the target column.
     * @param {string|undefined} targetColumn
     * @param {string|function|undefined} unresolvedValue
     * @returns {MergeGenerator}
     *
     * @example
     * - insert() - sets whole row
     * - insert(tgtCol, srcCol) - sets source column to target column
     * - insert(tgtCol, fn) - sets target column to whatever the fn resolves to.
     * @note the function takes arguments based on the context.
     * no error will be thrown in case of wrong NUMBER or ORDER of arguments provided.
     * just logically output will be wrong.
     * - accepts both target & source rows when presentInBoth. target argument first then source.
     * - accepts only target row when presentInTarget.
     * - accepts only source row when presentInSource.
     */
    insert(targetColumn, unresolvedValue) {
        const checkTargetColumn = this.#validateArguments(targetColumn, unresolvedValue);
        return this.#addCommand("insert", checkTargetColumn, targetColumn, unresolvedValue, this.#whenCondition);  // put input into this
    }

    /**
     * update a complete row or only some rows or a function which resolves to set the target column.
     * @param {string|undefined} targetColumn
     * @param {string|function|undefined} unresolvedValue
     * @returns {MergeGenerator}
     *
     * @example
     * - update() - sets whole row
     * - update(tgtCol, srcCol) - sets source column to target column
     * - update(tgtCol, fn) - sets target column to whatever the fn resolves to.
     * @note the function takes arguments based on the context.
     * no error will be thrown in case of wrong NUMBER or ORDER of arguments provided.
     * just logically output will be wrong.
     * - accepts both target & source rows when presentInBoth. target argument first then source.
     * - accepts only target row when presentInTarget.
     * - accepts only source row when presentInSource.
     */
    update(targetColumn, unresolvedValue) {
        const checkTargetColumn = this.#validateArguments(targetColumn, unresolvedValue);
        return this.#addCommand("update", checkTargetColumn, targetColumn, unresolvedValue, this.#whenCondition);  // put input into this
    }

    /**
     * deletes the row
     * @returns {MergeGenerator}
     */
    delete() {
        const checkTargetColumn = false;
        return this.#addCommand("delete", checkTargetColumn, null, null, this.#whenCondition);  // put input into this
    }

    /**
     * make source, match condition & commands immutable & return
     * @returns immutable mapping configuration
     */
    build() {
        let anyCommandSet = false;
        this.#commandBuffer.forEach(commandArray => {
            if (commandArray.length > 0)
                anyCommandSet = true;
            commandArray.forEach(cmd => Object.freeze(cmd));
            Object.freeze(commandArray);
        });
        if (!anyCommandSet)
            throw new Error("No commands are set. Use presentInBoth/Source/Target function & set some insert/update/delete commands.");

        return Object.freeze({
            source: this.#source,
            sourceColumns: this.#sourceColumns,
            matchOnCondition: this.#matchOnCondition,
            commandBuffer: Object.freeze(this.#commandBuffer)
        });
    }
}
