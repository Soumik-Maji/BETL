import { addColumn, drop, explode, filter, rename, select, take, updateColumn } from "./util/manipulator-functions/basic.js";
import { full, fullAnti, getJoinColumns, innerJoin, leftAnti, leftJoin, leftSemi, rightAnti, rightJoin, rightSemi, unionAll } from "./util/manipulator-functions/join.js";
import { regexMatch, renameRegexMapper } from "./util/regex-helper.js";
import { sort, SortLogicGenerator } from "./util/manipulator-functions/sorting.js";
import { DataTypes, customValidator, validateColumnPresence, validateDataType, validateNewColumn } from "./util/ParameterValidator.js";
import { map, MappingGenerator } from "./util/manipulator-functions/mapping.js";
import { deepFreeze } from "./util/deep-freeze-helper.js";
import { DeduplicateGenerator, deduplicate } from "./util/manipulator-functions/deduplicate.js";

const constructorKey = Symbol("ObjectArray");   // Symbol for object creation via private constructor

export class ObjectArray {

    #data;      // actual data of the table (array of objects)
    #logicPlan; // to store the operations which are to be applied (array of nested objects)
    #columns;   // store the most recent column names after an operation is registered (array)
    #isFrozen;  // manual check if #data is frozen or not(boolean)

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize ObjectArray using 'new'. Call static method createInstance() instead.");

        this.#data = [];
        this.#logicPlan = [];
        this.#columns = [];
        this.#isFrozen = false;
    }

    // ---------------------- INSTANCE CREATOR ----------------------
    /**
     * Checks validity & unformity of the passed array of objects.
     * Creates instance of ObjectArray from it.
     * @param {Object[]} jsonData
     * @returns {ObjectArray}
     */
    static createInstance(jsonData) {
        // check if whole data is array
        if (!Array.isArray(jsonData))
            throw new Error("Provided data is not an array.");

        if (jsonData.length === 0)
            throw new Error("Cannot create ObjectArray instance with empty data.");

        // check if every element in jsonData array is an object, not null & not array
        const isObject = jsonData.every(item =>
            (item !== null) && (typeof item === "object") && (!Array.isArray(item))
        );
        if (!isObject)
            throw new Error("Provided data is not array of objects.");

        // creating the instance
        const obj = new ObjectArray(constructorKey);

        if (jsonData.length !== 0) {
            // check objects' unformity
            const matchKeys = new Set(Object.keys(jsonData[0]));
            const isUniform = jsonData.every(item => {
                const keys = Object.keys(item);
                if (keys.length !== matchKeys.size)
                    return false;
                return keys.every(k => matchKeys.has(k));
            });
            if (!isUniform)
                throw new Error("Provided data array does not have uniform objects.");

            // initializing object if data is not empty
            obj.#data = structuredClone(jsonData);
            obj.#columns = Object.keys(obj.#data[0]);
        }

        return obj;
    }

    #internalCreateInstance(addedLogicPlan, newColumns) {
        const obj = new ObjectArray(constructorKey);
        obj.#data = this.#data;
        obj.#logicPlan = [...this.#logicPlan, addedLogicPlan];
        obj.#columns = newColumns;
        return obj;
    }

    // ---------------------- GETTERS ----------------------
    /**
    * gets a copy of column names
    * @returns {string[]}
    */
    get columns() {
        return [...this.#columns];
    }

    /**
     * gets a deep copy of the operations (ordered) to be applied on the data
     * @returns {Array}
     */
    get logicPlan() {
        const retVal = this.#logicPlan.map(operation => {
            const paramCopy = {};

            for (let key in operation.param) {
                if (typeof operation.param[key] === 'function') {
                    paramCopy[key] = operation.param[key].toString();
                } else {
                    paramCopy[key] = operation.param[key];
                }
            }

            return {
                "method": operation.method.name,
                "param": paramCopy
            };
        });
        return JSON.stringify(retVal, null, 2);
    }

    /**
    * gets a deep copy of the current state of source data
    * @returns {Object[]}
    */
    get data() {
        return structuredClone(this.#data);
    }

    /**
    * gets the current state of source data as deep frozen
    * @returns {Object[]}
    */
    get readOnlyData() {
        if (this.#isFrozen)
            return this.#data;

        this.#isFrozen = true;
        return deepFreeze(this.#data);
    }

    // ---------------------- EXECUTION METHODS ----------------------
    // below methods are for executing the pipeline

    // NOTE: need a pipeline optimizer step as well to call before #compute()

    /**
     * internal method which actually does the computation
     * @returns
     */
    #compute() {
        if (this.#data.length === 0)
            return [];

        let workingData = this.data;  // create a clone

        // loop through all operations applying them 1 by 1
        this.#logicPlan.forEach(operation => {
            workingData = operation.method(workingData, operation.param);
        });

        // returning mutated array of objects
        return workingData;
    }

    /**
     * non-destructive peek into the count of the data.
     * computes pipeline till here whenever called, does not clear the logic plan.
     *
     * USE WITH CAUTION to avoid unnecessary computations.
     * @returns {number}
     */
    count() {
        if (this.#logicPlan.length === 0)
            return this.#data.length;
        return this.#compute().length;
    }

    /**
     * executes the current pipeline & clears logic plan.
     * use this to compute the pipeline till here & get a branch new clone of result.
     * @returns {ObjectArray}
     */
    execute() {
        const resultData = this.#compute();
        const resultObject = new ObjectArray(constructorKey);
        resultObject.#data = resultData;
        resultObject.#logicPlan = [];
        resultObject.#columns = this.columns;

        return resultObject;
    }

    /**
     * logs the ObjectArray data after applying the current logic plan.
     * positive limit show first N, negative limit shows last N, (default) 0 shows all.
     *
     * uses execute() under the hood.
     * @param {Number} limit till which the data is logged
     * @returns {ObjectArray}
     */
    log(limit = 0, tableName = undefined) {
        validateDataType(limit, DataTypes.number);

        const resultObject = this.execute();

        if (tableName !== undefined)
            console.log(tableName);

        if (limit > 0)
            console.table(resultObject.#data.slice(0, limit), resultObject.#columns);
        else if (limit < 0)
            console.table(resultObject.#data.slice(limit), resultObject.#columns);
        else
            console.table(resultObject.#data, resultObject.#columns);

        return resultObject;
    }

    // ---------------------- LOGIC PLAN UPDATE METHODS ----------------------
    // below methods are for adding manipulation logics to the logicplan

    /**
     * renames the column name.
     * @param {string} oldKey old column name
     * @param {string} newKey new column name
     * @returns {ObjectArray}
     */
    rename(oldKey, newKey) {
        validateColumnPresence(this.#columns, oldKey);
        validateNewColumn(this.#columns, newKey);

        return this.#internalCreateInstance(
            {
                "method": rename,
                "param": { oldKey, newKey }
            },
            this.#columns.map(col => col === oldKey ? newKey : col)  // replacing the column name
        );
    }

    /**
     * renames all the column names which matches the RegEx pattern.
     * @param {string} oldRegex RegEx for old column name. for RegEx only * is allowed
     * @param {string} replacementRegex RegEx for new column name. for RegEx only $n is allowed, where 'n' is chunk number starting from 0
     * @example
     * _.renameRegex("LEFT.*", "$0") // columns with "LEFT." prefix replaced with the part just after "LEFT."
     * _.renameRegex("*__1Qt__*", "$0_$1") // column names having "__1Qt__" is replaced with "__1Qt__" removed & just an underscore between the 2 chunks
     * @returns {ObjectArray}
     */
    renameRegex(oldRegex, replacementRegex) {
        validateDataType(oldRegex, DataTypes.string);
        customValidator(oldRegex === "", `Passed regex cannot be empty string`);
        validateDataType(replacementRegex, DataTypes.string);
        customValidator(replacementRegex === "", `Passed regex cannot be empty string`);

        const updatedColumnList = renameRegexMapper(this.#columns, oldRegex, replacementRegex);
        let tempInstance = this;

        updatedColumnList.forEach(({ oldKey, newKey }) => {
            tempInstance = tempInstance.#internalCreateInstance(
                {
                    "method": rename,
                    "param": { oldKey, newKey }
                },
                tempInstance.#columns.map(col => col === oldKey ? newKey : col)  // replacing the column name
            );
        });

        return tempInstance;
    }

    /**
     * filters, keeping only the rows satisfying customFilter function.
     * @param {function} customFilter
     * @returns {ObjectArray}
     */
    filter(customFilter) {
        validateDataType(customFilter, DataTypes.function);

        return this.#internalCreateInstance(
            {
                "method": filter,
                "param": { customFilter }
            },
            this.columns
        );
    }

    /**
     * applies simple transformation functions on pre-existing columns.
     * like type casting, string manipulation, date-time conversions, conditionally transforming the column based on other columns, etc.
     * @param {string} columnName
     * @param {function} transformationFunction
     * @returns {ObjectArray}
     */
    updateColumn(columnName, transformationFunction) {
        validateColumnPresence(this.#columns, columnName);

        return this.#internalCreateInstance(
            {
                "method": updateColumn,
                "param": { columnName, transformationFunction }
            },
            this.columns
        );
    }

    /**
     * creates new columns using simple transformation functions on pre-existing columns. like type concatenation, etc.
     * @param {string} columnName
     * @param {function} transformationFunction
     * @returns {ObjectArray}
     */
    addColumn(columnName, transformationFunction) {
        validateNewColumn(this.#columns, columnName);

        const newcols = this.columns;
        newcols.push(columnName) // adding the column name

        return this.#internalCreateInstance(
            {
                "method": addColumn,
                "param": { columnName, transformationFunction }
            },
            newcols
        );
    }

    /**
     * select specific columns as per provided column names in spread operator syntax
     * @param  {...string} columnNames
     * @returns {ObjectArray}
     */
    select(...columnNames) {
        // if no parameter passed just return the existing object. Practically no use.
        if (columnNames.length === 0)
            return this;

        columnNames = [...(new Set(columnNames))];  // deduplicates the column names

        // validating the column names
        columnNames.forEach(columnName => validateColumnPresence(this.#columns, columnName));

        return this.#internalCreateInstance(
            {
                "method": select,
                "param": { columnNames, currentColumns: this.#columns }
            },
            columnNames
        );
    }

    /**
     * select specific columns as per provided RegEx
     * @param  {string} regex RegEx for column selection. for RegEx only * is allowed
     * @example
     * _.selectRegex("LEFT.*") // columns with "LEFT." prefix are to be selected
     * _.selectRegex("*__1Qt__*") // column names having "__1Qt__" are to be selected
     * @returns {ObjectArray}
     */
    selectRegex(regex) {
        validateDataType(regex, DataTypes.string);
        customValidator(regex === "", "Passed regex cannot be empty string");

        const columnNames = regexMatch(this.#columns, regex);

        return this.#internalCreateInstance(
            {
                "method": select,
                "param": { columnNames, currentColumns: this.#columns }
            },
            columnNames
        );
    }

    /**
     * deletes the columns provided as spread operator syntax
     * @param  {...string} columnNames
     * @returns {ObjectArray}
     */
    drop(...columnNames) {
        // validating the parameters
        customValidator(columnNames.length <= 0, "No column names to drop.");

        columnNames = [...(new Set(columnNames))];  // deduplicates the column names

        columnNames.forEach(columnName => validateColumnPresence(this.#columns, columnName));

        return this.#internalCreateInstance(
            {
                "method": drop,
                "param": { columnNames }
            },
            // removing the columns names
            this.#columns.filter(col => !columnNames.includes(col))
        );
    }

    /**
     * deletes the columns provided as RegEx
     * @param  {string} regex RegEx for column selection. for RegEx only * is allowed
     * @example
     * _.dropRegex("LEFT.*") // columns with "LEFT." prefix are to be dropped
     * _.dropRegex("*__1Qt__*") // column names having "__1Qt__" are to be dropped
     * @returns {ObjectArray}
     */
    dropRegex(regex) {
        validateDataType(regex, DataTypes.string);
        customValidator(regex === "", "Passed regex cannot be empty string");

        const columnNames = regexMatch(this.#columns, regex);

        return this.#internalCreateInstance(
            {
                "method": drop,
                "param": { columnNames }
            },
            // removing the columns names
            this.#columns.filter(col => !columnNames.includes(col))
        );
    }

    /**
     * copies & passes forward the selected part of the data only
     * @param {number} limit number of rows that need to be copied
     * @param {number} offset number of rows that need to be skipped
     * @returns {ObjectArray}
     */
    take(limit, offset = 0) {
        validateDataType(limit, DataTypes.number);
        validateDataType(offset, DataTypes.number);
        customValidator(limit < 0, "limit cannot be negative.");
        customValidator(offset < 0 || offset >= this.length, "offset cannot be negative or more than data count.");

        return this.#internalCreateInstance(
            {
                "method": take,
                "param": { limit, offset }
            },
            this.columns
        );
    }

    /**
     * accepts SortLogicGenerator instance.
     * need to call correct sorting order method.
     * need to mention the column name correctly.
     * [OPTIONALLY] can send a temporary transformation function to sort without storing them for long term.
     * @param {SortLogicGenerator} comparisonLogics
     * @returns {ObjectArray}
     */
    sort(comparisonLogics) {
        customValidator(!(comparisonLogics instanceof SortLogicGenerator), "Configuration must be an instance of SortLogicGenerator.");
        comparisonLogics = comparisonLogics.build();
        comparisonLogics.forEach(logic => validateColumnPresence(this.#columns, logic.column, "Column not found in data for sorting"));

        return this.#internalCreateInstance(
            {
                "method": sort,
                "param": { comparisonLogics }
            },
            this.columns
        );
    }

    // -- joining section --
    /**
     * performs an inner join between "this" & "other" ObjectArray instances.
     * prefixes ONLY duplicate column names from both tables with their source ("LEFT." & "RIGHT.")
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    innerJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            {
                "method": innerJoin,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition,
                    duplicateColumnFound, leftMapping, rightMapping
                }
            },
            allColumns
        );
    }

    /**
     * performs a left join between "this" & "other" ObjectArray instances
     * prefixes ONLY duplicate column names from both tables with their source ("LEFT." & "RIGHT.")
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    leftJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            {
                "method": leftJoin,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition,
                    duplicateColumnFound, leftMapping, rightMapping
                }
            },
            allColumns
        );
    }

    /**
     * performs a right join between "this" & "other" ObjectArray instances
     * prefixes ONLY duplicate column names from both tables with their source ("LEFT." & "RIGHT.")
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    rightJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            {
                "method": rightJoin,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition,
                    duplicateColumnFound, leftMapping, rightMapping
                }
            },
            allColumns
        );
    }

    /**
     * performs a left anti join between "this" & "other" ObjectArray instances
     * returns rows from left table which have no match in right table
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    leftAntiJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            {
                "method": leftAnti,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition
                }
            },
            this.columns
        );
    }

    /**
     * performs a right anti join between "this" & "other" ObjectArray instances
     * returns rows from right table which have no match in left table
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    rightAntiJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            {
                "method": rightAnti,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition
                }
            },
            other.columns
        );
    }

    /**
     * does a vertical merge on the 2 ObjectArray instances. does not remove the duplicate rows.
     * @param {ObjectArray} other
     * @returns {ObjectArray}
     */
    unionAll(other) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");

        this.#columns.forEach(col =>
            validateColumnPresence(other.#columns, col, "The column names do not match for the provided table in unionAll.")
        );

        return this.#internalCreateInstance(
            {
                "method": unionAll,
                "param": { right: other }   // execute triggers in join. thus lazy.
            },
            this.columns
        );
    }

    /**
     * performs a full anti join between "this" & "other" ObjectArray instances
     * prefixes ONLY duplicate column names from both tables with their source ("LEFT." & "RIGHT.")
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    fullAntiJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            {
                "method": fullAnti,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition,
                    duplicateColumnFound, leftMapping, rightMapping
                }
            },
            allColumns
        );
    }

    /**
     * performs a full join between "this" & "other" ObjectArray instances
     * prefixes ONLY duplicate column names from both tables with their source ("LEFT." & "RIGHT.")
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    fullJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            {
                "method": full,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition,
                    duplicateColumnFound, leftMapping, rightMapping
                }
            },
            allColumns
        );
    }

    /**
     * performs a cross join between "this" & "other" ObjectArray instances
     * prefixes ONLY duplicate column names from both tables with their source ("LEFT." & "RIGHT.")
     * @param {ObjectArray} other
     * @returns {ObjectArray}
     */
    crossJoin(other) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            {
                "method": innerJoin,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    duplicateColumnFound, leftMapping, rightMapping,
                    joinCondition: () => true
                }
            },
            allColumns
        );
    }

    /**
     * performs a left semi join between "this" & "other" ObjectArray instances
     * returns rows from right table which have a match in left table
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    leftSemiJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            {
                "method": leftSemi,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition
                }
            },
            this.columns
        );
    }

    /**
     * performs a right semi join between "this" & "other" ObjectArray instances
     * returns rows from right table which have no match in left table
     * @param {ObjectArray} other
     * @param {Function} joinCondition function follows an order of accepting tables. left is always left table & right is always right table.
     * @exampleJoinFunction (a, b) => a.productid === b.product_id; a is left table & b is right table
     * @returns {ObjectArray}
     */
    rightSemiJoin(other, joinCondition) {
        customValidator(!(other instanceof ObjectArray), "Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            {
                "method": rightSemi,
                "param": {
                    right: other,   // execute triggers in join. thus lazy.
                    joinCondition
                }
            },
            other.columns
        );
    }

    /**
     * explodes a column of the data into multiple rows.
     * designed to work with anything iterable & has length data member.
     * so works on both strings & arrays.
     * use with absolute certainity or after modifying all rows with updateColumn()
     * otherwise face unexpected results.
     * @param {string} columnName name of column which is to exploded
     * @returns {ObjectArray}
     */
    explode(columnName) {
        validateColumnPresence(this.#columns, columnName);

        return this.#internalCreateInstance(
            {
                "method": explode,
                "param": { columnName }
            },
            this.columns
        );
    }

    /**
     * maps the target's columns to respective source's columns
     * @param {MappingGenerator} mappingRelations
     * @returns {ObjectArray}
     */
    map(mappingRelations) {
        customValidator(!(mappingRelations instanceof MappingGenerator), "Configuration must be an instance of MappingGenerator.");
        mappingRelations = mappingRelations.build();

        mappingRelations.relations.forEach(({ tgt }) =>
            validateColumnPresence(this.#columns, tgt, "Column not found in target data for mapping")
        );

        return this.#internalCreateInstance(
            {
                "method": map,
                "param": { mappingRelations, currentColumns: this.#columns }
            },
            this.columns
        );
    }

    /**
     * de-duplicates the data as per provided column names.
     * OPTIONALLY can take a resolve function to determine which one of the duplicates to keep.
     * @param  {DeduplicateGenerator} deduplicationConfig
     * @returns {ObjectArray}
     */
    deduplicate(deduplicationConfig) {
        customValidator(!(deduplicationConfig instanceof DeduplicateGenerator), "Configuration must be an instance of DeduplicateGenerator.");
        deduplicationConfig = deduplicationConfig.build();

        deduplicationConfig.columns.forEach(col => validateColumnPresence(this.#columns, col));

        return this.#internalCreateInstance(
            {
                "method": deduplicate,
                "param": { deduplicationConfig }
            },
            this.columns
        );
    }

    /**
     * group by function similar to normal SQL
     * @param {GroupingGenerator} groupingData
     * @returns {ObjectArray}
     */
    // groupBy(groupingData) {
    //     const { groupingColumns, logics } = this.#validator.groupByParameterValidator(groupingData);

    //     const uniqueColumns = [...new Set(logics.map(item => item.column))];

    //     const groups = new Map();
    //     this.data.forEach(item => {
    //         const key = JSON.stringify(Object.fromEntries(groupingColumns.map(col => [col, item[col]])));
    //         let groupValue = groups.get(key);
    //         if (!groupValue) {
    //             groupValue = [];
    //             groups.set(key, groupValue);
    //         }

    //         const tmpObject = {};
    //         uniqueColumns.forEach(col => tmpObject[col] = item[col]);
    //         groupValue.push(tmpObject);
    //     });

    //     const newData = [];
    //     for (const [key, groupValue] of groups) {
    //         const tmpObject = { ...JSON.parse(key) };

    //         for (const { column, aggFunc, alias } of logics) {
    //             const tmpArray = groupValue.map(item => item[column]);
    //             const aggResult = aggFunc(tmpArray);
    //             tmpObject[alias] = aggResult;
    //         }
    //         newData.push(tmpObject);
    //     }
    //     return ObjectArray.createInstance(newData);
    // }




    // DESIGN FLAW: the JsonModifier is not consistent in how it handles arrays & objects
    //      proxies are applied on objects themselves -> later in pipeline changes might be trapped
    //      arrays are frozen -> not a big issue for now as the arrays themselves are temporary data store

    /*
        LATER ADDITION:
        - Another addition to ObjectArray instance method is checkExecutionTriggers()
            checkExecutionTriggers() -> goes recursively through the logicPlan of instance & checks how many execute calls are made
            idea is to have a predfined map of which methods call execute like joins & map-generator (so maybe indirectly maps) do but others don't
        - also make logicPlan getter to be able to take some argument to determine how much information to show to user
    */

}



//     window(windowSpecs) {
//         const { groupingColumns, sortingData, windowingData } = this.#validator.windowingParameterValidator(windowSpecs);

//         let tmpDataStore = (sortingData === null) ? this : this.sort(sortingData);
//         windowingData.forEach(({ alias }) => {
//             tmpDataStore = tmpDataStore.addColumn(alias, _ => undefined);
//         });

//         const groups = new Map();
//         tmpDataStore.data.forEach(item => {
//             const key = JSON.stringify(groupingColumns.map(col => item[col]));
//             if (!groups.has(key))
//                 groups.set(key, []);
//             groups.get(key).push(item);
//         });

//         tmpDataStore = Array.from(groups.values());     // re-using this to save some space
//         windowingData.forEach(({ windowFunction }) => {
//             windowFunction(JsonModifier.arrayOfObjectsProxy(tmpDataStore[0], { modifyProxy: false }))
//             tmpDataStore.forEach(group => windowFunction(group));
//         });

//         const newData = [];
//         groups.values().forEach(val => newData.push(...val));

//         return ObjectArray.createInstance(newData);
//     }
// }
