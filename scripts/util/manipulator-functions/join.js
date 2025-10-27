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

function duplicateColumnMerge(left, leftMapping, right, rightMapping) {
    const merged = {};
    for (const k in left)
        merged[leftMapping[k] || k] = left[k];
    for (const k in right)
        merged[rightMapping[k] || k] = right[k];
    return merged;
}

export function innerJoin(left, { right, joinCondition, duplicateColumnFound, leftMapping, rightMapping }) {
    // execute the other table's pipeline to get latest data till this call
    right = right.execute().data;

    const retval = [],
        leftLength = left.length,
        rightLength = right.length;

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
            if (joinCondition(leftRow, rightRow)) {
                if (duplicateColumnFound)
                    retval.push(duplicateColumnMerge(leftRow, leftMapping, rightRow, rightMapping));
                else
                    retval.push({ ...leftRow, ...rightRow });
            }
        }
    }
    return retval;
}
                else
                    retval.push({ ...leftRow, ...rightRow });
            }
        }
    }
    return retval;
}
