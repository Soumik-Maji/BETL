import { GroupingGenerator } from "../generators/GroupingGenerator.js";
import { MappingGenerator } from "../generators/MappingGenerator.js";
import { ObjectArray } from "./ObjectArray.js";
import { SortLogicGenerator } from "../generators/SortLogicGenerator.js";
import { HTMLOutput } from "../outputs/HTMLOutput.js";
import { RenameMapGenerator } from "../generators/RenameMapGenerator.js";
import { DeduplicateGenerator } from "../generators/DeduplicateGenerator.js";
import { WindowingGenerator } from "../generators/WindowingGenerator.js";

export class ParameterValidator {

    #data;
    constructor(objectArray, sampleData) {
        if (objectArray instanceof ObjectArray)
            this.#data = sampleData;
        else
            HTMLOutput.showError("ParameterValidator not called from ObjectArray")
    }

    static dataTypes = Object.freeze({
        string: "string",
        number: "number",
        boolean: "boolean",
        object: "object",
        function: "function"
    });
    /**
     * throws error if the data type not matched with above provided types
     * @param {*} n
     * @param {ParameterValidator.dataTypes} type
     */
    validateDataType(n, type) {
        if (!(type in ParameterValidator.dataTypes))
            HTMLOutput.showError(`${type} is not a valid data type.`);

        if (typeof n !== type)
            HTMLOutput.showError(`Data type of '${n}' is not ${type}.`);
    }

    /**
     * throws Error if column name not present in any object
     * @param {string} columnName
     * @param {ArrayOfObjects} data
     */
    validateColumnPresence(columnName) {
        if (columnName.trim() === "")
            HTMLOutput.showError("Column Name must be a non-empty String");

        this.validateDataType(columnName, ParameterValidator.dataTypes.string);

        // no need to check for every object as they are validated before
        if (!(this.#data.hasOwnProperty(columnName)))
            HTMLOutput.showError(`'${columnName}' - No such column in data`);
    }

    static #pattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;    // regex to check for column names starting with alphabet & then it can have alphabet/ underscore/ number and nothing else
    /**
     * throws Error if column name does not match regex pattern /^[a-zA-Z][a-zA-Z0-9_]*$/
     * @param {string} columnName
     * @param {ArrayOfObjects} data
     */
    validateNewColumn(columnName) {
        this.validateDataType(columnName, ParameterValidator.dataTypes.string);

        if (!(ParameterValidator.#pattern.test(columnName)))    // empty string check is done by regex
            HTMLOutput.showError(`'${columnName}' is not a valid column name to use.`);

        // no need to check for every object as they are validated before
        if (this.#data.hasOwnProperty(columnName))
            HTMLOutput.showError(`'${columnName}' - already exists in data`);
    }

    /**
    * for creating small validators which is required for that particular case
    * @param {boolean} condition
    * @param {string} errorMessage
    */
    customValidator(condition, errorMessage) {
        if (condition)
            HTMLOutput.showError(errorMessage);
    }

    /**
     * throws Error if old column name not present in table & new column name is not valid
     * @param {RenameMapGenerator} renameMap
     * @returns parsed rename map
     */
    renameMapParameterValidator(renameMap) {
        if (!(renameMap instanceof RenameMapGenerator))
            HTMLOutput.showError("Rename Map is not from RenameMapGenerator.");

        const parsedRenameMap = renameMap.build();
        const objectRenameMap = {};

        parsedRenameMap.forEach(({ oldKey, newKey }) => {
            this.validateColumnPresence(oldKey);
            this.validateNewColumn(newKey);
            objectRenameMap[oldKey] = newKey;
        });
        return objectRenameMap;
    }

    /**
     * throws Error if column names not present & resolve function is not a function
     * @param {DeduplicateGenerator} deduplicationData
     * @returns parsed de-duplication data
     */
    deduplicateParameterValidator(deduplicationData) {
        if (!(deduplicationData instanceof DeduplicateGenerator))
            HTMLOutput.showError("Deduplication data is not from DeduplicateGenerator.");

        const { columns, resolveFunction } = deduplicationData.build();

        columns.forEach(column => this.validateColumnPresence(column));
        this.validateDataType(resolveFunction, ParameterValidator.dataTypes.function);

        return { columnNames: columns, resolveFunction };
    }

    /**
     * throws Error if column name not present & temporary transformation function is not a function
     * @param {SortLogicGenerator} comparisonLogics
     * @returns parsed comparison logics
     */
    sortParameterValidator(comparisonLogics) {
        if (!(comparisonLogics instanceof SortLogicGenerator))
            HTMLOutput.showError("Comparison Logics is not from SortLogicGenerator.");

        const parsedComparisonLogics = comparisonLogics.build();

        parsedComparisonLogics.forEach(item => {
            this.validateColumnPresence(item.column);
            this.validateDataType(item.transformationFunction, ParameterValidator.dataTypes.function);
        });
        return parsedComparisonLogics;
    }

    /**
     * throws Error if grouping column names are not present & if aggregator column name same as grouping column name and other type match failures
     * @param {GroupingGenerator} groupingData
     * @returns parsed grouping data & aggregation functions
     */
    groupByParameterValidator(groupingData) {
        if (!(groupingData instanceof GroupingGenerator))
            HTMLOutput.showError("Aggregation Data is not from GroupingGenerator.");

        const parsedGroupings = groupingData.build();
        const { groupingColumns, logics } = parsedGroupings;

        if (!Array.isArray(groupingColumns))
            HTMLOutput.showError(`${groupingColumns} is not of type array.`);

        groupingColumns.forEach(col => this.validateColumnPresence(col));

        logics.forEach(({ column, alias, aggFunc, ignore }) => {
            // alias duplicacy check
            if (logics.filter(item => item.alias === alias).length > 1)
                HTMLOutput.showError(`Same alias ${alias} present more than once.`);

            // for count only ignore will be true, otherwise undefined; and !undefined is true
            if (!ignore)
                this.validateColumnPresence(column);

            if (groupingColumns.includes(column))
                HTMLOutput.showError(`'${column}' is used as grouping column. Can not apply aggregation on it.`)

            this.validateNewColumn(alias);
            this.validateDataType(aggFunc, ParameterValidator.dataTypes.function);
        })

        return parsedGroupings;
    }

    /**
     * throws error if target column name not present in "this" data & source column names not present in "source" data
     * @param {MappingGenerator} mappingRelations
     * @returns parsed mapping relationships between columns
     */
    mapParameterValidator(mappingRelations) {
        if (!(mappingRelations instanceof MappingGenerator))
            HTMLOutput.showError("Mapping Relations is not from MappingGenerator.");

        const parsedMappingRelations = mappingRelations.build();
        const { source, relations } = parsedMappingRelations;

        if (!(source instanceof ObjectArray))
            HTMLOutput.showError("Source for mapping is not instance of ObjectArray.");

        relations.forEach(item => {
            this.validateColumnPresence(item.tgt);
            source.validator.validateColumnPresence(item.src);
        })

        return parsedMappingRelations;
    }

    windowingParameterValidator(windowSpecs) {
        if (!(windowSpecs instanceof WindowingGenerator))
            HTMLOutput.showError("Windowing specifications is not from WindowingGenerator.");

        const parsedWindowingData = windowSpecs.build();
        const { groupingColumns, sortingData, windowingData } = parsedWindowingData;
        const parsedSortingData = (sortingData !== null) && this.sortParameterValidator(sortingData);     // sorting data is validated

        groupingColumns.forEach(colName => {
            this.validateColumnPresence(colName);
            if (sortingData !== null) {
                const isGroupingInSort = parsedSortingData.some(({ column }) => colName === column);
                if (isGroupingInSort)
                    HTMLOutput.showError(`Cannot sort using a partitioning column '${colName}'`);
            }
        });

        windowingData.forEach(item => this.validateDataType(item.windowFunction, ParameterValidator.dataTypes.function));

        return parsedWindowingData;
    }

}
