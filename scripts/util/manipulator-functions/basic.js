/*
    figure out how I can put all these operations to make a single pass
    over the array as all these are O(n) operations on the main array
    not considering the resizing array thing going on in explode, filter & take
*/

import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function explode(arr, { columnName }) {
    const len = arr.length;
    for (let i = 0; i < len; i++) {
        const row = arr[i];
        const cell = row[columnName];
        const cellLength = cell.length;

        row[columnName] = cell[0];  // overewrite the original column

        // then start pushing rows with updated column value to original array
        for (let j = 1; j < cellLength; j++)
            arr.push({ ...row, [columnName]: cell[j] });
    }
    return arr;
}

export function rename(arr, { oldKey, newKey }) {
    const len = arr.length;
    for (let i = 0; i < len; i++) {
        const row = arr[i];
        const oldValue = row[oldKey];
        delete row[oldKey];
        row[newKey] = oldValue;
    }
    return arr;
}

export function filter(arr, { customFilter }) {
    const len = arr.length;
    if (len === 0)
        return [];

    // I hope checking filter function on 1 element is enough
    // APPLY CUSTOM FILTER FUNCTION ON PROXIED EXAMPLE OBJECT
    // THIS WAY ALL GET, DELETE & PROPER FILTER FUNCTION IS CHECKED
    let boolVal = customFilter(JsonModifier.objectProxy(arr[0]));
    validateDataType(boolVal, DataTypes.boolean, "Filter function does not return boolean");

    let writeIndex = 0;
    for (let i = 0; i < len; i++) {
        const row = arr[i];
        if (customFilter(row)) {
            arr[writeIndex] = row;
            writeIndex++;
        }
    }
    arr.length = writeIndex;

    return arr;
}

export function updateColumn(arr, { columnName, transformationFunction }) {
    const len = arr.length;
    if (len === 0)
        return [];

    // Same thinking as for above filter function
    transformationFunction(JsonModifier.objectProxy(arr[0]));

    for (let i = 0; i < len; i++) {
        const row = arr[i];
        row[columnName] = transformationFunction(row);
    }
    return arr;
}

export function addColumn(arr, { columnName, transformationFunction }) {
    const len = arr.length;
    if (len === 0)
        return [];

    // Same thinking as for above filter function
    transformationFunction(JsonModifier.objectProxy(arr[0]));

    for (let i = 0; i < len; i++) {
        const row = arr[i];
        row[columnName] = transformationFunction(row);
    }
    return arr;
}

export function select(arr, { columnNames, currentColumns }) {
    const columnsToDelete = currentColumns.filter(col => !columnNames.includes(col));

    const len = arr.length;
    for (let i = 0; i < len; i++) {
        const row = arr[i];
        columnsToDelete.forEach(key => delete row[key]);
    }
    return arr;
}

export function drop(arr, { columnNames }) {
    const len = arr.length;
    for (let i = 0; i < len; i++) {
        const row = arr[i];
        columnNames.forEach(key => delete row[key]);
    }
    return arr;
}

export function take(arr, { limit, offset }) {
    let writeIndex = 0;
    for (let i = offset; i < offset + limit; i++) {
        arr[writeIndex] = arr[i];
        writeIndex++;
    }
    arr.length = writeIndex;

    return arr;
}
