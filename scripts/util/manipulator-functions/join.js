import { JsonModifier } from "../JsonModifier.js";
import { DataTypes, customValidator } from "../ParameterValidator.js";

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
        "allColumns": [...leftCols, ...rightCols]
    };
}

// NOTE: DO NOT MUTATE ANYTHING HERE AS WORKING WITH REFERENCES
function mergeRows(leftRow, leftMapping, rightRow, rightMapping, duplicateColumnFound) {
    if (duplicateColumnFound) {
        const merged = {};
        for (const k in leftRow)
            merged[leftMapping[k] || k] = leftRow[k];
        for (const k in rightRow)
            merged[rightMapping[k] || k] = rightRow[k];
        return merged;
    }
    return { ...leftRow, ...rightRow };
}

export function innerJoin(left, { right, joinCondition, duplicateColumnFound, leftMapping, rightMapping }) {
    // execute the other table's pipeline to get latest data till this call
    right = right.execute().data;

    const retval = [], leftLength = left.length, rightLength = right.length;

    if (leftLength === 0 || rightLength === 0)
        return retval;

    const boolVal = joinCondition(JsonModifier.objectProxy(left[0]), JsonModifier.objectProxy(right[0]));
    customValidator(
        typeof boolVal !== DataTypes.boolean,
        "Join condition function does not return boolean"
    );

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
    right = right.data;

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
    customValidator(
        typeof boolVal !== DataTypes.boolean,
        "Join condition function does not return boolean"
    );

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
    right = right.execute().data;

    const emptyLeftRow = {},
        leftColumns = Object.keys(leftMapping), leftColumnsLength = leftColumns.length;
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
    customValidator(
        typeof boolVal !== DataTypes.boolean,
        "Join condition function does not return boolean"
    );

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
