// import { GroupingGenerator } from "../generators/GroupingGenerator.js";
// import { MappingGenerator } from "../generators/MappingGenerator.js";
// import { ParameterValidator } from "./ParameterValidator.js";
// import { SortLogicGenerator } from "../generators/SortLogicGenerator.js";
// import { JsonModifier } from "../json-modifier/JsonModifier.js";
// import { HTMLOutput } from "../outputs/HTMLOutput.js";
// import { RenameMapGenerator } from "../generators/RenameMapGenerator.js";
// import { DeduplicateGenerator } from "../generators/DeduplicateGenerator.js";


const constructorKey = Symbol("ObjectArray");   // Symbol for object creation via private constructor

export class ObjectArray {

    #data;      // actual data of the table (array of objects)
    #logicPlan; // to store the operations which are to be applied (array)
    #columns;   // store the most recent column names after an operation is registered (un-ordered array)

    constructor(passedKey) {
        if (passedKey !== constructorKey)
            throw new Error("Cannot initialize using 'new'. Call createInstance() instead.");
        this.#data = [];
        this.#logicPlan = [];
        this.#columns = [];
        return this;
    }

    // INSTANCE CREATOR
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

    // GETTERS
    /**
    * gets a deep copy of the data
    * @returns {Object[]}
    */
    get data() {
        return structuredClone(this.#data);     // creating issues when doing with proxies
    }

    /**
     * gets number of rows of the data
     * @returns {number}
     */
    get count() {
        return this.#data.length;
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
        return structuredClone(this.#logicPlan);
    }

}



//     // METHODS
//     /**
//      * Logs the current ObjectArray data & returns the instance.
//      * Positive limit show first N, negative limit shows last N, (default) 0 shows all
//      * @param {Number} limit till which the data is logged
//      * @returns ObjectArray instance
//      */
//     show(limit = 0) {
//         this.#validator.validateDataType(limit, ParameterValidator.dataTypes.number);

//         if (limit > 0)
//             console.table(this.#data.slice(0, limit));
//         else if (limit < 0)
//             console.table(this.#data.slice(limit));
//         else if (limit === 0)
//             console.table(this.#data);
//         return this;
//     }

//     /**
//      * Display the current ObjectArray data in webpage & returns the instance.
//      * Positive limit show first N, negative limit shows last N, (default) 0 shows all
//      * @param {string} tableName name for table
//      * @param {Number} limit till which the data is displayed
//      * @param {string} theme for web page table (light/dark). default is dark
//      * @returns ObjectArray instance
//      */
//     showHTML(tableName, limit = 0, theme) {
//         this.#validator.validateDataType(limit, ParameterValidator.dataTypes.number);

//         if (limit > 0)
//             HTMLOutput.createTable(tableName, this.#data.slice(0, limit), theme);
//         else if (limit < 0)
//             HTMLOutput.createTable(tableName, this.#data.slice(limit), theme);
//         else if (limit === 0)
//             HTMLOutput.createTable(tableName, this.#data, theme);
//         return this;
//     }

//     /**
//      * renames the object key
//      * @param {string} oldKey
//      * @param {string} newKey
//      * @returns ObjectArray instance
//      */
//     rename(oldKey, newKey) {
//         this.#validator.validateColumnPresence(oldKey);
//         this.#validator.validateNewColumn(newKey);

//         return ObjectArray.#internalCreateInstance(
//             this.data.map(item => {
//                 const newItem = {};
//                 Object.keys(item).forEach(key =>
//                     newItem[key === oldKey ? newKey : key] = item[key]
//                 );
//                 return newItem;
//             })
//         );
//     }

//     /**
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
//      * plain javascript array filter function
//      * @param {function} customFilter
//      * @returns ObjectArray instance
//      */
//     filter(customFilter) {
//         this.#validator.validateDataType(customFilter, ParameterValidator.dataTypes.function);

//         // clone the data
//         const jsonData = this.data;

//         // APPLY CUSTOM FUNCTION ON PROXIED EXAMPLE OBJECT
//         // THIS WAY ALL GET, DELETE & PROPER FILTER FUNCTION IS CHECKED
//         const boolVal = customFilter(JsonModifier.objectProxy(jsonData[0]));
//         this.#validator.customValidator(
//             typeof boolVal !== ParameterValidator.dataTypes.boolean,
//             "Filter function does not return boolean"
//         );

//         return ObjectArray.#internalCreateInstance(
//             jsonData.filter(customFilter)
//         );
//     }

//     /**
//      * accepts an array of objects of keys, their order (optional) & transformationFunction (optional) to apply on them when comparing; and sort accordingly to return new array.
//      * @param {SortLogicGenerator} comparisonLogics
//      * @returns ObjectArray instance
//      */
//     sort(comparisonLogics) {
//         const parsedComparisonLogics = this.#validator.sortParameterValidator(comparisonLogics);

//         return ObjectArray.#internalCreateInstance(
//             this.data.toSorted((a, b) => {
//                 for (const { column, order, transformationFunction } of parsedComparisonLogics) {
//                     const aVal = transformationFunction(a[column]),
//                         bVal = transformationFunction(b[column]);
//                     if (typeof aVal === "string" && typeof bVal === "string") {
//                         const comparison = aVal.localeCompare(bVal);
//                         if (comparison !== 0)
//                             return order === "desc" ? -comparison : comparison;
//                     }
//                     else {
//                         if (aVal < bVal)
//                             return order === "desc" ? 1 : -1;
//                         if (aVal > bVal)
//                             return order === "desc" ? -1 : 1;
//                     }
//                 }
//                 return 0;
//             })
//         );
//     }

//     /**
//      * applies simple transformation functions on pre-existing columns. Like type casting, string manipulation, date-time conversions, conditionally transforming the column based on other columns, etc.
//      * @param {string} columnName
//      * @param {function} transformationFunction
//      * @returns ObjectArray instance
//      */
//     // CON: for separate columns separate functions need to called by function chaining
//     updateColumn(columnName, transformationFunction) {
//         this.#validator.validateColumnPresence(columnName);

//         const jsonData = this.data;
//         transformationFunction(JsonModifier.objectProxy(jsonData[0]));

//         return ObjectArray.#internalCreateInstance(
//             jsonData.map(item => {
//                 return { ...item, [columnName]: transformationFunction(item) };
//             })
//         );
//     }

//     /**
//      * creates new columns using simple transformation functions on pre-existing columns. Like type concatenation, etc.
//      * @param {string} columnName
//      * @param {function} transformationFunction
//      * @returns ObjectArray instance
//      */
//     // CON: for separate columns separate functions need to called by function chaining
//     addColumn(columnName, transformationFunction) {
//         this.#validator.validateNewColumn(columnName);

//         const jsonData = this.data;
//         transformationFunction(JsonModifier.objectProxy(jsonData[0]));

//         return ObjectArray.#internalCreateInstance(
//             jsonData.map(item => {
//                 return { ...item, [columnName]: transformationFunction(item) };
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
//      * reorder/select specific columns as per provided column names in spread operator syntax
//      * @param  {...string} columnNames
//      * @returns ObjectArray instance
//      */
//     select(...columnNames) {
//         // if no parameter passed just return the existing object. Practically no use.
//         if (columnNames.length === 0)
//             return this;

//         // validating the parameters
//         columnNames.forEach(columnName => this.#validator.validateColumnPresence(columnName));

//         return ObjectArray.#internalCreateInstance(
//             this.data.map(item => {    // loop through all objects
//                 const tmpObject = {};   // create a temporary object
//                 columnNames.forEach(key => tmpObject[key] = item[key]); // save key-value pairs in new order
//                 return tmpObject;
//             })
//         );
//     }

//     /**
//      * copies & passes forward the selected part of the data only
//      * @param {number} limit number of rows that need to be copied
//      * @param {number} offset number of rows that need to be skipped
//      * @returns ObjectArray instance
//      */
//     take(limit, offset = 0) {
//         this.#validator.validateDataType(limit, ParameterValidator.dataTypes.number);
//         this.#validator.validateDataType(offset, ParameterValidator.dataTypes.number);
//         this.#validator.customValidator(limit < 0, "limit cannot be negative.");
//         this.#validator.customValidator(offset < 0 || offset >= this.length, "offset cannot be negative or more than data count.");

//         return ObjectArray.#internalCreateInstance(this.data.slice(offset, offset + limit));
//     }

//     /**
//      * deletes the columns provided as spread operator syntax
//      * @param  {...string} columnNames
//      * @returns ObjectArray instance
//      */
//     drop(...columnNames) {
//         // validating the parameters
//         this.#validator.customValidator(columnNames.length <= 0, "No column names to drop.");
//         columnNames.forEach(columnName => this.#validator.validateColumnPresence(columnName));

//         return ObjectArray.#internalCreateInstance(
//             this.data.map(item => {     // working with a deep clone of data
//                 columnNames.forEach(key => delete item[key]);
//                 return item;
//             })
//         );
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
