export const DataTypes = Object.freeze({
    string: "string",
    number: "number",
    boolean: "boolean",
    object: "object",
    function: "function"
});
/**
 * throws error if the data type not matched with above provided types
 * @param {*} n
 * @param {DataTypes} type
 */
export function validateDataType(n, type) {
    if (!(type in DataTypes))
        throw new Error(`Invalid data type passed. Only below ones can be verified.\n${JSON.stringify(DataTypes, null, 2)}`);

    if (typeof n !== type)
        throw new Error(`Data type of "${n}" is not ${type}.`);
}

/**
 * throws Error if column name not present in any Object. checked via columns member
 * @param {string[]} columnsPresent
 * @param {string} columnName
 */
export function validateColumnPresence(columnsPresent, columnName) {
    validateDataType(columnName, DataTypes.string);

    columnName = columnName.trim();
    if (columnName === "")
        throw new Error("Column Name must be a non-empty String");

    // no need to check for every object as they are validated before
    if (!(columnsPresent.includes(columnName)))
        throw new Error(`"${columnName}" - No such column in data`);
}

// regex to check for column names starting with alphabet & then it can have alphabet/ underscore/ number and nothing else
const pattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
/**
 * throws Error if column name does not match regex pattern /^[a-zA-Z][a-zA-Z0-9_]*$/
 * @param {string[]} columnsPresent
 * @param {string} columnName
 */
export function validateNewColumn(columnsPresent, columnName) {
    validateDataType(columnName, DataTypes.string);

    if (!(pattern.test(columnName)))    // empty string check is done by regex
        throw new Error(`"${columnName}" is not a valid column name to use.`);

    // no need to check for every object as they are validated before
    if (columnsPresent.includes(columnName))
        throw new Error(`"${columnName}" - already exists in data`);
}

/**
 * for creating small validators which is required for that particular case
 * @param {boolean} condition
 * @param {string} errorMessage
 */
export function customValidator(condition, errorMessage) {
    if (condition)
        throw new Error(errorMessage);
}
