import { unsafeData } from "../../ObjectArray.js";
import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, validateDataType } from "../ParameterValidator.js";

export function getJoinColumns(leftCols, rightCols) {
    // leftCols & rightCols are usually small arrays
    // so Array is a better fit than Set due to creation overhead
    const duplicates = leftCols.filter(col => rightCols.includes(col));

    if (duplicates.length > 0) {
        const leftMapping = leftCols.reduce((acc, col) => {
            acc[col] = duplicates.includes(col) ? `LEFT.${col}` : col
            return acc;
        }, {});

        const rightMapping = rightCols.reduce((acc, col) => {
            acc[col] = duplicates.includes(col) ? `RIGHT.${col}` : col
            return acc;
        }, {});

        return {
            "duplicateColumnFound": true,
            leftMapping, rightMapping,
            "allColumns": [...Object.values(leftMapping), ...Object.values(rightMapping)]
        };
    }

    return {
        "duplicateColumnFound": false,
        "leftMapping": Object.fromEntries(leftCols.map(c => [c, c])),
        "rightMapping": Object.fromEntries(rightCols.map(c => [c, c])),
        "allColumns": [...leftCols, ...rightCols]
    };
}

// NOTE: DO NOT MUTATE ANYTHING HERE AS WORKING WITH REFERENCES
function mergeRows(leftRow, leftMapping, rightRow, rightMapping, duplicateColumnFound) {
    if (duplicateColumnFound) {
        const merged = {};
        for (const k in leftRow)
            merged[k in leftMapping ? leftMapping[k] : k] = leftRow[k];
        for (const k in rightRow)
            merged[k in rightMapping ? rightMapping[k] : k] = rightRow[k];
        return merged;
    }
    return { ...leftRow, ...rightRow };
}

export function innerJoin(left, { right, joinCondition, duplicateColumnFound, leftMapping, rightMapping }) {
    // accept if array OR execute the other table's pipeline to get latest data till this call
    right = Array.isArray(right) ? right : right.execute()[unsafeData];

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (leftLength === 0 || rightLength === 0)
        return [];

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    validateDataType(boolVal, DataTypes.boolean, "Join condition function does not return boolean");

    for (let li = 0; li < leftLength; li++) {
        const leftRow = left[li];
        for (let ri = 0; ri < rightLength; ri++) {
            const rightRow = right[ri];
            if (joinCondition(leftRow, rightRow))
                retval.push(mergeRows(leftRow, leftMapping, rightRow, rightMapping, duplicateColumnFound));
        }
    }
    return retval;
}

export function leftJoin(left, { right, joinCondition, duplicateColumnFound, leftMapping, rightMapping }) {
    right = right.execute();
    const rightColumns = right.columns;
    right = right[unsafeData];

    const emptyRightRow = {}, rightColumnsLength = rightColumns.length;
    for (let i = 0; i < rightColumnsLength; i++)
        emptyRightRow[rightColumns[i]] = null;

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (leftLength === 0)
        return [];
    if (rightLength === 0) {
        for (let li = 0; li < leftLength; li++)
            retval.push(mergeRows(left[li], leftMapping, emptyRightRow, rightMapping, duplicateColumnFound));
        return retval;
    }

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    validateDataType(boolVal, DataTypes.boolean, "Join condition function does not return boolean");

    for (let li = 0; li < leftLength; li++) {
        const leftRow = left[li];
        let matched = false;
        for (let ri = 0; ri < rightLength; ri++) {
            const rightRow = right[ri];
            if (joinCondition(leftRow, rightRow)) {
                matched = true;
                retval.push(mergeRows(leftRow, leftMapping, rightRow, rightMapping, duplicateColumnFound));
            }
        }
        if (!matched)
            retval.push(mergeRows(leftRow, leftMapping, emptyRightRow, rightMapping, duplicateColumnFound));
    }

    return retval;
}

export function rightJoin(left, { right, joinCondition, duplicateColumnFound, leftMapping, rightMapping }) {
    right = right.execute()[unsafeData];

    const emptyLeftRow = {}, leftColumns = Object.keys(leftMapping), leftColumnsLength = leftColumns.length;
    for (let i = 0; i < leftColumnsLength; i++)
        emptyLeftRow[leftColumns[i]] = null;

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (rightLength === 0)
        return [];
    if (leftLength === 0) {
        for (let ri = 0; ri < rightLength; ri++)
            retval.push(mergeRows(emptyLeftRow, leftMapping, right[ri], rightMapping, duplicateColumnFound));
        return retval;
    }

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    validateDataType(boolVal, DataTypes.boolean, "Join condition function does not return boolean");

    for (let ri = 0; ri < rightLength; ri++) {
        const rightRow = right[ri];
        let matched = false;
        for (let li = 0; li < leftLength; li++) {
            const leftRow = left[li];
            if (joinCondition(leftRow, rightRow)) {
                matched = true;
                retval.push(mergeRows(leftRow, leftMapping, rightRow, rightMapping, duplicateColumnFound));
            }
        }
        if (!matched)
            retval.push(mergeRows(emptyLeftRow, leftMapping, rightRow, rightMapping, duplicateColumnFound));
    }

    return retval;
}

export function leftAnti(left, { right, joinCondition }) {
    right = Array.isArray(right) ? right : right.execute()[unsafeData];

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (leftLength === 0)
        return [];
    if (rightLength === 0)
        return left;

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    validateDataType(boolVal, DataTypes.boolean, "Join condition function does not return boolean");

    for (let li = 0; li < leftLength; li++) {
        const leftRow = left[li];
        let matched = false;
        for (let ri = 0; ri < rightLength; ri++) {
            const rightRow = right[ri];
            if (joinCondition(leftRow, rightRow)) {
                matched = true;
                break;
            }
        }
        if (!matched)
            retval.push(leftRow);
    }

    return retval;
}

export function rightAnti(left, { right, joinCondition }) {
    right = Array.isArray(right) ? right : right.execute()[unsafeData];

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (rightLength === 0)
        return [];
    if (leftLength === 0)
        return right;

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    validateDataType(boolVal, DataTypes.boolean, "Join condition function does not return boolean");

    for (let ri = 0; ri < rightLength; ri++) {
        const rightRow = right[ri];
        let matched = false;
        for (let li = 0; li < leftLength; li++) {
            const leftRow = left[li];
            if (joinCondition(leftRow, rightRow)) {
                matched = true;
                break;
            }
        }
        if (!matched)
            retval.push(rightRow);
    }

    return retval;
}

export function unionAll(left, { right }) {
    right = right.execute()[unsafeData];

    const rightLength = right.length;
    for (let i = 0; i < rightLength; i++)
        left.push(right[i]);
    return left;
}

// LATER OPTIMIZATION: use single pass on full anti join & keep it standalone, as right.execute() can be expensive
export function fullAnti(left, params) {
    let { right, joinCondition, duplicateColumnFound, leftMapping, rightMapping } = params;
    right = Array.isArray(right) ? right : right.execute()[unsafeData];    // running execute on right to cache result & cut out repeatitive pipeline execution

    // empty row addition to left anti join
    const emptyRightRow = {}, rightColumns = Object.keys(rightMapping), rightColumnsLength = rightColumns.length;
    for (let i = 0; i < rightColumnsLength; i++)
        emptyRightRow[rightColumns[i]] = null;

    const leftAntiJoined = leftAnti(left, { right, joinCondition }),
        leftAntiJoinedLength = leftAntiJoined.length;
    for (let i = 0; i < leftAntiJoinedLength; i++)
        leftAntiJoined[i] = mergeRows(leftAntiJoined[i], leftMapping, emptyRightRow, rightMapping, duplicateColumnFound);

    // empty row addition to right anti join
    const emptyLeftRow = {}, leftColumns = Object.keys(leftMapping), leftColumnsLength = leftColumns.length;
    for (let i = 0; i < leftColumnsLength; i++)
        emptyLeftRow[leftColumns[i]] = null;

    const rightAntiJoined = rightAnti(left, { right, joinCondition }),
        rightAntiJoinedLength = rightAntiJoined.length;
    for (let i = 0; i < rightAntiJoinedLength; i++) {
        rightAntiJoined[i] = mergeRows(emptyLeftRow, leftMapping, rightAntiJoined[i], rightMapping, duplicateColumnFound);

        leftAntiJoined.push(rightAntiJoined[i]);    // pushing right into left one, so that new array allocation is not needed
    }

    return leftAntiJoined;
}

// LATER OPTIMIZATION: use single pass on full join & keep it standalone, as right.execute() can be expensive
export function full(left, params) {
    let { right, ...rest } = params;
    right = right.execute()[unsafeData];    // running execute on right to cache result & cut out repeatitive pipeline execution
    params = { right, ...rest };

    const fullAntiJoinedData = fullAnti(left, params);
    const innerJoinedData = innerJoin(left, params);

    const fullAntiJoinedLength = fullAntiJoinedData.length;
    for (let i = 0; i < fullAntiJoinedLength; i++)
        innerJoinedData.push(fullAntiJoinedData[i]);

    return innerJoinedData;
}

export function leftSemi(left, { right, joinCondition }) {
    right = right.execute()[unsafeData];

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (leftLength === 0 || rightLength === 0)
        return [];

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    validateDataType(boolVal, DataTypes.boolean, "Join condition function does not return boolean");

    for (let li = 0; li < leftLength; li++) {
        const leftRow = left[li];
        let matched = false;
        for (let ri = 0; ri < rightLength; ri++) {
            const rightRow = right[ri];
            if (joinCondition(leftRow, rightRow)) {
                matched = true;
                break;
            }
        }
        if (matched)
            retval.push(leftRow);
    }

    return retval;
}

export function rightSemi(left, { right, joinCondition }) {
    right = right.execute()[unsafeData];

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (leftLength === 0 || rightLength === 0)
        return [];

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    validateDataType(boolVal, DataTypes.boolean, "Join condition function does not return boolean");

    for (let ri = 0; ri < rightLength; ri++) {
        const rightRow = right[ri];
        let matched = false;
        for (let li = 0; li < leftLength; li++) {
            const leftRow = left[li];
            if (joinCondition(leftRow, rightRow)) {
                matched = true;
                break;
            }
        }
        if (matched)
            retval.push(rightRow);
    }

    return retval;
}
