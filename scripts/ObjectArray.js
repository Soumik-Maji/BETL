import { addColumn, drop, filter, rename, select, take, updateColumn } from "./util/manipulator-functions/basic.js";
import { innerJoin } from "./util/manipulator-functions/join.js";
import { sort, SortLogicGenerator } from "./util/manipulator-functions/sorting.js";
import { DataTypes, customValidator, validateColumnPresence, validateDataType, validateNewColumn } from "./util/ParameterValidator.js";

const constructorKey = Symbol("ObjectArray");   // Symbol for object creation via private constructor

export class ObjectArray {

    #data;      // actual data of the table (array of objects)
    #logicPlan; // to store the operations which are to be applied (array)
    #columns;   // store the most recent column names after an operation is registered (un-ordered array)

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize ObjectArray using 'new'. Call static method createInstance() instead.");

        this.#data = [];
        this.#logicPlan = [];
        this.#columns = [];
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
    * gets a deep copy of the current state of source data
    * @returns {Object[]}
    */
    get data() {
        return structuredClone(this.#data);     // creating issues when doing with proxies
    }

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

    // ---------------------- EXECUTION METHODS ----------------------
    // below methods are for executing the pipeline

    // NOTE: need a pipeline optimizer step as well to call before #compute()

    /**
     * internal method which actually does the computation
     * @returns
     */
    #compute() {
        if (this.#data.length === 0) {
            console.warn("Nothing to do on empty data.");
            return [];
        }

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
    log(limit = 0) {
        validateDataType(limit, DataTypes.number);

        const resultObject = this.execute();

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
            this.columns.map(col => col === oldKey ? newKey : col)  // replacing the column name
        );
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

        // validating the column names
        columnNames.forEach(columnName => validateColumnPresence(this.#columns, columnName));

        return this.#internalCreateInstance(
            {
                "method": select,
                "param": { columnNames, currentColumns: this.columns }
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
        columnNames.forEach(columnName => validateColumnPresence(this.#columns, columnName));

        return this.#internalCreateInstance(
            {
                "method": drop,
                "param": { columnNames }
            },
            // removing the columns names
            this.columns.filter(col => !columnNames.includes(col))
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
        comparisonLogics.forEach(logic => validateColumnPresence(this.#columns, logic.column));

        return this.#internalCreateInstance(
            {
                "method": sort,
                "param": { comparisonLogics }
            },
            this.columns
        );
    }


}


//     /**
//        DON'T ADD THIS METHOD (WILL BE IMPLEMENTING SINGLE PASS LATER TO OVERCOME THIS)
//      * bulk renames column names using RenameMapGenerator
//      * @param {RenameMapGenerator} renameMap
//      * @returns ObjectArray instance
//      */
//     renameMany(renameMap) {
//         const parsedRenameMap = this.#validator.renameMapParameterValidator(renameMap);

//         return ObjectArray.#internalCreateInstance(
//             this.data.map(item => {
//                 const newItem = {};
//                 Object.keys(item).forEach(key => {
//                     const renameKey = parsedRenameMap[key] || key;
//                     newItem[renameKey] = item[key];
//                 });
//                 return newItem;
//             })
//         );
//     }

//     /**
//      * de-duplicates the data as per provided column names in spread operator syntax
//      * @param  {DeduplicateGenerator} deduplicationData
//      * @returns ObjectArray instance
//      */
//     deduplicate(deduplicationData) {
//         const { columnNames, resolveFunction } = this.#validator.deduplicateParameterValidator(deduplicationData);

//         let keyForCheck = null;
//         const uniques = new Map();
//         this.data.forEach(item => {
//             const key = JSON.stringify(columnNames.map(col => item[col]));
//             keyForCheck = key;      // storing to fetch later for proxy check
//             if (!uniques.has(key))
//                 uniques.set(key, []);
//             uniques.get(key).push(item);
//         });

//         // validating the resolve function for illegal operations
//         resolveFunction(JsonModifier.arrayOfObjectsProxy(uniques.get(keyForCheck)));

//         const newData = [];
//         for (const value of uniques.values())
//             newData.push(resolveFunction(value));

//         return ObjectArray.createInstance(newData);
//     }

//     /**
//      * group by function similar to normal SQL
//      * @param {GroupingGenerator} groupingData
//      * @returns ObjectArray instance
//      */
//     groupBy(groupingData) {
//         const { groupingColumns, logics } = this.#validator.groupByParameterValidator(groupingData);

//         const uniqueColumns = [...new Set(logics.map(item => item.column))];

//         const groups = new Map();
//         this.data.forEach(item => {
//             const key = JSON.stringify(Object.fromEntries(groupingColumns.map(col => [col, item[col]])));
//             let groupValue = groups.get(key);
//             if (!groupValue) {
//                 groupValue = [];
//                 groups.set(key, groupValue);
//             }

//             const tmpObject = {};
//             uniqueColumns.forEach(col => tmpObject[col] = item[col]);
//             groupValue.push(tmpObject);
//         });

//         const newData = [];
//         for (const [key, groupValue] of groups) {
//             const tmpObject = { ...JSON.parse(key) };

//             for (const { column, aggFunc, alias } of logics) {
//                 const tmpArray = groupValue.map(item => item[column]);
//                 const aggResult = aggFunc(tmpArray);
//                 tmpObject[alias] = aggResult;
//             }
//             newData.push(tmpObject);
//         }
//         return ObjectArray.createInstance(newData);
//     }

//     /**
//      * maps the target's columns to respective source's columns
//      * @param {MappingGenerator} mappingRelations
//      * @returns ObjectArray instance
//      */
//     map(mappingRelations) {
//         // validating & parsing the mapping relation instance
//         const { source, relations } = this.#validator.mapParameterValidator(mappingRelations);

//         // gathering the target's data
//         const targetData = this.data;
//         // gathering the target's object structure
//         const targetDataStructure = {};
//         Object.keys(targetData[0]).forEach(key => targetDataStructure[key] = null);

//         source.data.forEach(row => {    // loop over all source rows
//             const newRow = { ...targetDataStructure };      // copy structure into temporary object

//             for (const relation of relations)     // loop over columns to copy into temporary object
//                 newRow[relation.tgt] = row[relation.src];

//             targetData.push(newRow);     // push into target
//         });
//         return ObjectArray.createInstance(targetData);
//     }

//     /**
//      * performs an inner join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     innerJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         const leftTable = this.data, rightTable = otherTable.data;

//         const boolVal = joinCondition(JsonModifier.objectProxy(leftTable[0]), JsonModifier.objectProxy(rightTable[0]));
//         this.#validator.customValidator(
//             typeof boolVal !== ParameterValidator.dataTypes.boolean,
//             "Join condition function does not return boolean"
//         );

//         const emptyDataStructure = {};
//         Object.keys(leftTable[0]).forEach(key => emptyDataStructure[key] = null);
//         Object.keys(rightTable[0]).forEach(key => emptyDataStructure[key] = null);

//         const retval = [];
//         leftTable.forEach(ltrow =>
//             rightTable.filter(rtrow => joinCondition(ltrow, rtrow))
//                 .forEach(matchedRow => retval.push({ ...ltrow, ...matchedRow }))
//         );

//         return retval.length === 0 ?
//             ObjectArray.createInstance([emptyDataStructure]) :
//             ObjectArray.createInstance(retval);
//     }

//     /**
//      * performs a left join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     leftJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         const leftTable = this.data, rightTable = otherTable.data;

//         const boolVal = joinCondition(JsonModifier.objectProxy(leftTable[0]), JsonModifier.objectProxy(rightTable[0]));
//         this.#validator.customValidator(
//             typeof boolVal !== ParameterValidator.dataTypes.boolean,
//             "Join condition function does not return boolean"
//         );

//         const emptyDataStructure = {};
//         Object.keys(leftTable[0]).forEach(key => emptyDataStructure[key] = null);
//         Object.keys(rightTable[0]).forEach(key => emptyDataStructure[key] = null);

//         const retval = [];
//         leftTable.forEach(ltrow => {
//             const matchedRows = rightTable.filter(rtrow => joinCondition(ltrow, rtrow));
//             if (matchedRows.length > 0)
//                 matchedRows.forEach(matchedRow => retval.push({ ...ltrow, ...matchedRow }))
//             else {
//                 retval.push({ ...emptyDataStructure, ...ltrow });
//             }
//         });

//         return retval.length === 0 ?
//             ObjectArray.createInstance([emptyDataStructure]) :
//             ObjectArray.createInstance(retval);
//     }

//     /**
//      * performs a right join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     rightJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         // creating another function which is the reverse of joinCondition(), by swapping the passed parameters.
//         const reverseJoinCondition = (a, b) => joinCondition(b, a);
//         const uniqueOrderedColumns = new Set([...this.columns, ...otherTable.columns]);

//         return otherTable.leftJoin(this, reverseJoinCondition)
//             .select(...uniqueOrderedColumns);
//     }

//     /**
//      * performs a left anti join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     leftAntiJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         const leftTable = this.data, rightTable = otherTable.data;

//         const boolVal = joinCondition(JsonModifier.objectProxy(leftTable[0]), JsonModifier.objectProxy(rightTable[0]));
//         this.#validator.customValidator(
//             typeof boolVal !== ParameterValidator.dataTypes.boolean,
//             "Join condition function does not return boolean"
//         );

//         const emptyDataStructure = {};
//         Object.keys(leftTable[0]).forEach(key => emptyDataStructure[key] = null);
//         Object.keys(rightTable[0]).forEach(key => emptyDataStructure[key] = null);

//         const retval = [];
//         leftTable.forEach(ltrow => {
//             const matchedRows = rightTable.filter(rtrow => joinCondition(ltrow, rtrow));
//             if (matchedRows.length === 0)
//                 retval.push({ ...emptyDataStructure, ...ltrow });
//         });

//         return retval.length === 0 ?
//             ObjectArray.createInstance([emptyDataStructure]) :
//             ObjectArray.createInstance(retval);
//     }

//     /**
//      * performs a right anti join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     rightAntiJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         // creating another function which is the reverse of joinCondition(), by swapping the passed parameters.
//         const reverseJoinCondition = (a, b) => joinCondition(b, a);
//         const uniqueOrderedColumns = new Set([...this.columns, ...otherTable.columns]);

//         return otherTable.leftAntiJoin(this, reverseJoinCondition)
//             .select(...uniqueOrderedColumns);
//     }

//     /**
//      * simply merges the array of objects of both instances
//      * @param {ObjectArray} otherTable
//      * @returns ObjectArray instance
//      */
//     unionAll(otherTable) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");

//         return ObjectArray.createInstance([...this.data, ...otherTable.data]);
//     }

//     /**
//      * performs a full anti join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     fullAntiJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         return this.leftAntiJoin(otherTable, joinCondition)
//             .unionAll(this.rightAntiJoin(otherTable, joinCondition));
//     }

//     /**
//      * performs a full join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     fullJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         return this.fullAntiJoin(otherTable, joinCondition)
//             .unionAll(this.innerJoin(otherTable, joinCondition));
//     }

//     /**
//      * performs a cross join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @returns ObjectArray instance
//      */
//     crossJoin(otherTable) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");

//         return this.innerJoin(otherTable, (a, b) => true);
//     }

//     /**
//      * performs a left semi join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     leftSemiJoin(otherTable, joinCondition) {
//         this.#validator.customValidator(!(otherTable instanceof ObjectArray), "Need an ObjectArray instance to work with.");
//         this.#validator.validateDataType(joinCondition, ParameterValidator.dataTypes.function);

//         const leftTable = this.data, rightTable = otherTable.data;

//         const boolVal = joinCondition(JsonModifier.objectProxy(leftTable[0]), JsonModifier.objectProxy(rightTable[0]));
//         this.#validator.customValidator(
//             typeof boolVal !== ParameterValidator.dataTypes.boolean,
//             "Join condition function does not return boolean"
//         );

//         const retval = [];
//         leftTable.forEach(ltrow => {
//             const hasMatch = rightTable.some(rtrow => joinCondition(ltrow, rtrow));
//             if (hasMatch)
//                 retval.push(ltrow);
//         });

//         return retval.length === 0 ?
//             ObjectArray.createInstance([emptyDataStructure]) :
//             ObjectArray.createInstance(retval);
//     }

//     /**
//      * performs a right semi join between "this" & "otherTable" ObjectArray instances
//      * @param {ObjectArray} otherTable
//      * @param {Function} joinCondition condition follows an order of accepting tables. left is always left table & right is always right table.
//      * @returns ObjectArray instance
//      */
//     rightSemiJoin(otherTable, joinCondition) {
//         // creating another function which is the reverse of joinCondition(), by swapping the passed parameters.
//         const reverseJoinCondition = (a, b) => joinCondition(b, a);

//         return otherTable.leftSemiJoin(this, reverseJoinCondition);
//     }

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
