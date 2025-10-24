import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, customValidator } from "../ParameterValidator.js";

export function rename(arr, { oldKey, newKey }) {
    for (let i = 0; i < arr.length; i++) {
        const oldValue = arr[i][oldKey];
        delete arr[i][oldKey];
        arr[i][newKey] = oldValue;
    }
}

export function filter(arr, { customFilter }) {
    if (arr.length === 0) {
        console.warn(`Empty array sent for filtering.\nfilter function -> ${customFilter}`);
        return;
    }

    // I hope checking filter function on 1 element is enough
    // APPLY CUSTOM FILTER FUNCTION ON PROXIED EXAMPLE OBJECT
    // THIS WAY ALL GET, DELETE & PROPER FILTER FUNCTION IS CHECKED
    let boolVal = customFilter(JsonModifier.objectProxy(structuredClone(arr[0])));
    customValidator(typeof boolVal !== DataTypes.boolean, "Filter function does not return boolean");

    let writeIndex = 0;
    for (let i = 0; i < arr.length; i++) {
        if (customFilter(arr[i])) {
            arr[writeIndex] = arr[i];
            writeIndex++;
        }
    }
    arr.length = writeIndex;
}

export function updateColumn(arr, { columnName, transformationFunction }) {
    if (arr.length === 0) {
        console.warn(`Empty array sent for column - ${columnName} update.\ntransformation function -> ${customFilter}`);
        return;
    }
    // Same thinking as for above filter function
    transformationFunction(JsonModifier.objectProxy(structuredClone(arr[0])));

    for (let i = 0; i < arr.length; i++) {
        arr[i][columnName] = transformationFunction(arr[i]);
    }
}

export function addColumn(arr, { columnName, transformationFunction }) {
    if (arr.length === 0) {
        console.warn(`Empty array sent for column - ${columnName} addition.\ntransformation function -> ${customFilter}`);
        return;
    }
    // Same thinking as for above filter function
    transformationFunction(JsonModifier.objectProxy(structuredClone(arr[0])));

    for (let i = 0; i < arr.length; i++) {
        arr[i][columnName] = transformationFunction(arr[i]);
    }
}

export function select(arr, { columnNames, columns }) {
    const columnsToDelete = columns.filter(col => !columnNames.includes(col));

    for (let i = 0; i < arr.length; i++) {
        columnsToDelete.forEach(key => delete arr[i][key]);
    }
}

export function drop(arr, { columnNames }) {
    for (let i = 0; i < arr.length; i++) {
        columnNames.forEach(key => delete arr[i][key]);
    }
}

export function take(arr, { limit, offset }) {
    let writeIndex = 0;
    for (let i = offset; i < offset + limit; i++) {
        arr[writeIndex] = arr[i];
        writeIndex++;
    }
    arr.length = writeIndex;
}
