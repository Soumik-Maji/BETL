import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, customValidator } from "../ParameterValidator.js";

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
    if (len === 0) {
        console.warn(`Empty array sent for filtering.\nfilter function -> ${customFilter}`);
        return;
    }

    // I hope checking filter function on 1 element is enough
    // APPLY CUSTOM FILTER FUNCTION ON PROXIED EXAMPLE OBJECT
    // THIS WAY ALL GET, DELETE & PROPER FILTER FUNCTION IS CHECKED
    let boolVal = customFilter(JsonModifier.objectProxy(structuredClone(arr[0])));
    customValidator(typeof boolVal !== DataTypes.boolean, "Filter function does not return boolean");

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
    if (len === 0) {
        console.warn(`Empty array sent for column - ${columnName} update.\ntransformation function -> ${customFilter}`);
        return;
    }
    // Same thinking as for above filter function
    transformationFunction(JsonModifier.objectProxy(structuredClone(arr[0])));

    for (let i = 0; i < len; i++) {
        const row = arr[i];
        row[columnName] = transformationFunction(row);
    }
    return arr;
}

export function addColumn(arr, { columnName, transformationFunction }) {
    const len = arr.length;
    if (len === 0) {
        console.warn(`Empty array sent for column - ${columnName} addition.\ntransformation function -> ${customFilter}`);
        return;
    }
    // Same thinking as for above filter function
    transformationFunction(JsonModifier.objectProxy(structuredClone(arr[0])));

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
