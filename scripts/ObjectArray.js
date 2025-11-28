import { addColumn, drop, explode, filter, rename, select, take, updateColumn } from "./util/manipulator-functions/basic.js";
import { full, fullAnti, getJoinColumns, innerJoin, leftAnti, leftJoin, leftSemi, rightAnti, rightJoin, rightSemi, unionAll } from "./util/manipulator-functions/join.js";
import { regexMatch, renameRegexMapper } from "./util/regex-helper.js";
import { SortGenerator, sort } from "./util/manipulator-functions/sorting.js";
import { DataTypes, validateColumnName, validateColumnPresence, validateDataType, validateNewColumn } from "./util/ParameterValidator.js";
import { AppendGenerator, append } from "./util/manipulator-functions/appending.js";
import { deepFreeze } from "./util/deep-freeze-helper.js";
import { DeduplicateGenerator, deduplicate } from "./util/manipulator-functions/deduplicate.js";
import { GroupByGenerator, groupBy } from "./util/manipulator-functions/grouping.js";
import { WindowGenerator, windowing } from "./util/manipulator-functions/window.js";
import { PivotGenerator, pivot } from "./util/manipulator-functions/pivoting.js";
import { MeltGenerator, melt } from "./util/manipulator-functions/melting.js";

const constructorKey = Symbol("ObjectArray");   // Symbol for object creation via private constructor

export class ObjectArray {

    #data;      // actual data of the table (array of objects)
    #logicPlan; // to store the operations which are to be applied (array of nested objects)
    #columns;   // store the most recent column names after an operation is registered (array)
    #isFrozen;  // manual check if #data is frozen or not (boolean)

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
            throw new Error("Cannot create ObjectArray instance with empty data. use createEmptyInstance() instead.");

        // check if every element in jsonData array is an object, not null & not array
        const isObject = jsonData.every(item =>
            (item !== null) && (typeof item === "object") && (!Array.isArray(item))
        );
        if (!isObject)
            throw new Error("Provided data is not array of objects.");

        // validate column names
        const firstKeys = Object.keys(jsonData[0]);
        for (const key of firstKeys)    // check if column names are valid
            validateColumnName(key, `Failed to create ObjectArray instance due to invalid column name '${key}'`);

        // check objects' unformity
        const matchKeys = new Set(firstKeys);
        const isUniform = jsonData.every(item => {
            const keys = Object.keys(item);
            if (keys.length !== matchKeys.size)
                return false;
            return keys.every(k => matchKeys.has(k));
        });
        if (!isUniform)
            throw new Error("Provided data array does not have uniform objects.");

        // creating the instance
        const obj = new ObjectArray(constructorKey);
        obj.#columns = firstKeys;
        obj.#data = structuredClone(jsonData);

        return obj;
    }

    /**
     * creates ObjectArray instance with no data in it. just the column names.
     * @param {...string} columnNames
     * @returns {ObjectArray}
     */
    static createEmptyInstance(...columnNames) {
        if (columnNames.length === 0)
            throw new Error("Cannot create empty ObjectArray instance with no column names.");

        if ((new Set(columnNames)).size !== columnNames.length)
            throw new Error("Cannot create empty ObjectArray instance with duplicate column names.");

        for (const col of columnNames)
            validateColumnName(col, `Failed to create empty ObjectArray instance as column name '${col}' is not valid`);

        const obj = new ObjectArray(constructorKey);
        obj.#columns = columnNames;
        return obj;
    }

    /**
     * stacks up the operations with latest operation & column names
     * @param {Function} operationName
     * @param {Object} parameter
     * @param {string[]} newColumns
     * @returns {ObjectArray}
     */
    #internalCreateInstance(operationName, parameter, newColumns) {
        /*
            THIS METHOD IS USED BY THE MANIPULATION METHOD FOR STACKING UP LOGIC PLAN.
            COLUMN NAME VALIDATION IS DONE IN THEM, NO NEED HERE. [MOST PROBABLY]
        */
        const obj = new ObjectArray(constructorKey);
        obj.#data = this.#data;
        const addedLogicPlan = { "method": operationName, "param": parameter };
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
        resultObject.#columns = this.columns;

        return resultObject;
    }

    /**
     * logs the ObjectArray data in stringified json format after applying the current logic plan.
     *
     * uses execute() under the hood.
     * @returns {ObjectArray}
     */
    printJSON() {
        const resultObject = this.execute();
        console.log(JSON.stringify(resultObject.#data, null, 2));
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
            rename,
            { oldKey, newKey },
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
        if (oldRegex.trim() === "")
            throw new Error(`Passed regex cannot be empty string`);
        validateDataType(replacementRegex, DataTypes.string);
        if (replacementRegex.trim() === "")
            throw new Error(`Passed regex cannot be empty string`);

        const updatedColumnList = renameRegexMapper(this.#columns, oldRegex, replacementRegex);
        let tempInstance = this;

        updatedColumnList.forEach(({ oldKey, newKey }) => {
            tempInstance = tempInstance.#internalCreateInstance(
                rename,
                { oldKey, newKey },
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
            filter,
            { customFilter },
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
            updateColumn,
            { columnName, transformationFunction },
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
            addColumn,
            { columnName, transformationFunction },
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
            select,
            { columnNames, currentColumns: this.#columns },
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
        if (regex.trim() === "")
            throw new Error("Passed regex cannot be empty string");

        const columnNames = regexMatch(this.#columns, regex);

        return this.#internalCreateInstance(
            select,
            { columnNames, currentColumns: this.#columns },
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
        if (columnNames.length <= 0)
            throw new Error("No column names to drop.");

        columnNames = [...(new Set(columnNames))];  // deduplicates the column names

        columnNames.forEach(columnName => validateColumnPresence(this.#columns, columnName));

        return this.#internalCreateInstance(
            drop,
            { columnNames },
            this.#columns.filter(col => !columnNames.includes(col)) // removing the columns names
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
        if (regex.trim() === "")
            throw new Error("Passed regex cannot be empty string");

        const columnNames = regexMatch(this.#columns, regex);

        return this.#internalCreateInstance(
            drop,
            { columnNames },
            this.#columns.filter(col => !columnNames.includes(col)) // removing the columns names
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
        if (limit < 0)
            throw new Error("limit cannot be negative.");
        if (offset < 0 || offset >= this.length)
            throw new Error("offset cannot be negative or more than data count.");

        return this.#internalCreateInstance(
            take,
            { limit, offset },
            this.columns
        );
    }

    /**
     * accepts SortGenerator instance.
     * need to call correct sorting order method.
     * need to mention the column name correctly.
     * [OPTIONALLY] can send a temporary transformation function to sort without storing them for long term.
     * @param {SortGenerator} comparisonLogics
     * @returns {ObjectArray}
     */
    sort(comparisonLogics) {
        if (!(comparisonLogics instanceof SortGenerator))
            throw new Error("Configuration must be an instance of SortGenerator.");
        comparisonLogics = comparisonLogics.build();
        comparisonLogics.forEach(logic => validateColumnPresence(this.#columns, logic.column, "Column not found in data for sorting"));

        return this.#internalCreateInstance(
            sort,
            { comparisonLogics },
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            innerJoin,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition,
                duplicateColumnFound, leftMapping, rightMapping
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            leftJoin,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition,
                duplicateColumnFound, leftMapping, rightMapping
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            rightJoin,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition,
                duplicateColumnFound, leftMapping, rightMapping
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            leftAnti,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            rightAnti,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");

        this.#columns.forEach(col =>
            validateColumnPresence(other.#columns, col, "The column names do not match for the provided table in unionAll.")
        );

        return this.#internalCreateInstance(
            unionAll,
            { right: other },   // execute triggers in join. thus lazy.
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            fullAnti,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition,
                duplicateColumnFound, leftMapping, rightMapping
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            full,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition,
                duplicateColumnFound, leftMapping, rightMapping
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        const { duplicateColumnFound, leftMapping, rightMapping, allColumns } = getJoinColumns(this.#columns, other.#columns);

        return this.#internalCreateInstance(
            innerJoin,
            {
                right: other,   // execute triggers in join. thus lazy.
                duplicateColumnFound, leftMapping, rightMapping,
                joinCondition: () => true
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            leftSemi,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition
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
        if (!(other instanceof ObjectArray))
            throw new Error("Need an ObjectArray instance to perform join.");
        validateDataType(joinCondition, DataTypes.function);

        return this.#internalCreateInstance(
            rightSemi,
            {
                right: other,   // execute triggers in join. thus lazy.
                joinCondition
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
            explode,
            { columnName },
            this.columns
        );
    }

    /**
     * append specified source columns to target columns.
     * @param {AppendGenerator} appendRelations
     * @returns {ObjectArray}
     */
    append(appendRelations) {
        if (!(appendRelations instanceof AppendGenerator))
            throw new Error("Configuration must be an instance of AppendGenerator.");
        appendRelations = appendRelations.build();

        appendRelations.relations.forEach(({ tgt }) =>
            validateColumnPresence(this.#columns, tgt, "Column not found in target data for mapping")
        );

        return this.#internalCreateInstance(
            append,
            { appendRelations, currentColumns: this.#columns },
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
        if (!(deduplicationConfig instanceof DeduplicateGenerator))
            throw new Error("Configuration must be an instance of DeduplicateGenerator.");
        deduplicationConfig = deduplicationConfig.build();

        deduplicationConfig.columns.forEach(col =>
            validateColumnPresence(this.#columns, col, "Column not found in deduplication data for deduplicating")
        );

        return this.#internalCreateInstance(
            deduplicate,
            { deduplicationConfig },
            this.columns
        );
    }

    /**
     * group by function similar to normal SQL
     * @param {GroupByGenerator} groupingConfig
     * @returns {ObjectArray}
     */
    groupBy(groupingConfig) {
        if (!(groupingConfig instanceof GroupByGenerator))
            throw new Error("Configuration must be an instance of GroupByGenerator.");
        groupingConfig = groupingConfig.build();
        const { groupingColumns, logics } = groupingConfig;
        const newColumns = [];

        // validating
        groupingColumns.forEach(col => {
            validateColumnPresence(this.#columns, col, "Grouping column not found in grouping data");
            newColumns.push(col);
        });

        logics.forEach(({ column, alias, ignore }) => {
            if (!ignore)
                validateColumnPresence(this.#columns, column, "Aggregating column not found in grouping data");
            validateNewColumn(this.#columns, alias, "Invalid alias for aggregating column")
            newColumns.push(alias);
        });

        return this.#internalCreateInstance(
            groupBy,
            { groupingConfig },
            newColumns
        );
    }

    /**
     * NOTE / TODO:
     * - range between is not implemented
     * - actual function is implemented but not very optimal due to several copies & stuff inside hotloop
     * - also there could be some hidden bugs, check for it as well
     *
     * window function similar to normal SQL, with some added quirks.
     * - row & range frames are independent for each function
     * - several functions can be stacked in a functional manner
     * @param {WindowGenerator} windowConfig
     * @returns {ObjectArray}
     */
    window(windowConfig) {
        if (!(windowConfig instanceof WindowGenerator))
            throw new Error("Configuration must be an instance of WindowGenerator.");

        const newColumns = this.columns;
        windowConfig = windowConfig.build();
        const { groupingColumns, sortingData, windowingData } = windowConfig;

        // validating
        groupingColumns.forEach(col => validateColumnPresence(this.#columns, col, "Wrong column provided for pratition by in WindowGenerator"));

        sortingData.forEach(logic => validateColumnPresence(this.#columns, logic.column, "Column not found in data for sorting in WindowGenerator"));

        windowingData.forEach(wid => {
            validateNewColumn(this.#columns, wid.alias);
            validateDataType(wid.windowFunction, DataTypes.function)
            if (wid.type === 1 && !wid.ignore)   // 1 is for frame functions. column checks for them & ignore for special countAll
                validateColumnPresence(this.#columns, wid.column);

            newColumns.push(wid.alias);
        });

        return this.#internalCreateInstance(
            windowing,
            { windowConfig, newColumns },
            newColumns
        );
    }

    /**
     * NOTE: Pivoting requries the current state of the table data, so it executes the logic plan before proceeding with it's own operation.
     * This is the only operation which performs eager evaluation instead of lazy like the others. Use with CAUTION.
     *
     * Rotates the data from long to wide format, converting unqiue values from pivot column into multiple columns.
     * Acts similar to pivot function in other tools.
     * The only caveat is grouping/deduplication based on non-value columns is not handled by pivot.
     * Do it prior to this step using dedicated groupby or deduplicate function.
     * @param {PivotGenerator} pivotConfig
     * @returns {ObjectArray}
     */
    pivot(pivotConfig) {
        // REQUIREMENT: trigger execution of pipeline before performing a pivot operation to get latest value or rows
        const dataTillHere = this.#compute();
        const columnsTillHere = this.columns;

        // config validation
        if (!(pivotConfig instanceof PivotGenerator))
            throw new Error("Configuration must be an instance of PivotGenerator.");

        pivotConfig = pivotConfig.build();
        const { pivotCol, valuesCol } = pivotConfig;
        validateColumnPresence(columnsTillHere, pivotCol, "Pivot column is not present in data");
        valuesCol.forEach(col =>
            validateColumnPresence(columnsTillHere, col, `Value column ${col} is not present in data`)
        );

        const { resultData, resultColumns } = pivot(dataTillHere, { pivotConfig, columnsTillHere });
        const resultObject = new ObjectArray(constructorKey);
        resultObject.#data = resultData;
        resultObject.#columns = resultColumns;
        return resultObject;
    }

    /**
     * Unpivots or melts the mentioned table columns. Make wide tables tall.
     * Converts the mentioned column names to a new column &
     * the values of those columns to an adjacent column.
     * @param {MeltGenerator} meltConfig
     * @returns {ObjectArray}
     */
    melt(meltConfig) {
        // config validation
        if (!(meltConfig instanceof MeltGenerator))
            throw new Error("Configuration must be an instance of MeltGenerator.");

        meltConfig = meltConfig.build();
        const { sourceColumns, groupColumnName, valueColumnName } = meltConfig;
        sourceColumns.forEach(col =>
            validateColumnPresence(this.#columns, col, "Source column for melt is not present in data")
        );
        validateNewColumn(this.#columns, groupColumnName, "Column name provided for melt columns is already present in data");
        validateNewColumn(this.#columns, valueColumnName, "Column name provided for melt values is already present in data");

        const restColumns = this.#columns.filter(col => !sourceColumns.includes(col));
        return this.#internalCreateInstance(
            melt,
            { meltConfig, restColumns },
            [...restColumns, groupColumnName, valueColumnName]
        );
    }

    /*
        implement an upsert function similar to spark's merge
        make it handle several things at once like -
        conditional insert
        conditional updateAll
        conditional selective update
        conditional delete
        conditional selective delete
        etc.
    */

    /*
        LATER ADDITION:
        - Another addition to ObjectArray instance method is checkExecutionTriggers()
            checkExecutionTriggers() -> goes recursively through the logicPlan of instance & checks how many execute calls are made
            idea is to have a predfined map of which methods call execute like joins & map-generator (so maybe indirectly maps) do but others don't
        - also make logicPlan getter to be able to take some argument to determine how much information to show to user
    */

}
