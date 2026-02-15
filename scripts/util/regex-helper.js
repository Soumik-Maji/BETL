/*
    This is RegEx. I'm terrible at it.
    Don't understand any of the regex shit here.
    Thanks to ChatGPT for the invaluable assistance in writing these 2 functions
*/

/**
 * returns an array of objects of matched strings & their resolved replacement
 * @param {string[]} list array of strings
 * @param {string} pattern pattern which is to be matched. supports only *
 * @param {string} replace pattern to which to resolve to. supports only $n, where n = chunk number starting at 0
 * @example // examples are from the usecase of this function
 * _.renameRegex("LEFT.*", "$0") // columns with "LEFT." prefix replaced with the part just after "LEFT."
 * _.renameRegex("*__1Qt__*", "$0_$1") // column names having "__1Qt__" is replaced with "__1Qt__" removed & just an underscore between the 2 chunks
 * @returns {string[]}
 */
export function renameRegexMapper(list, pattern, replace) {
    // Validation: count * and $n
    const numStars = (pattern.match(/\*/g) || []).length;
    const dollarIndices = (replace.match(/\$(\d+)/g) || []).map(s => +s.slice(1));
    const maxDollar = Math.max(...dollarIndices, -1);

    if (maxDollar >= numStars)
        throw new Error(`Replacement references $${maxDollar} but pattern has only ${numStars} *\nRegEx index starts at 0`);

    // Escape regex metacharacters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace * with capture group for allowed characters
    const regex = new RegExp('^' + escaped.replace(/\*/g, '(.+?)') + '$');

    const renamed = [], unchanged = [];

    list.forEach(str => {
        const match = str.match(regex);
        if (!match)
            unchanged.push(str);
        else {
            // Replace $n with captured group n
            const newStr = replace.replace(/\$(\d+)/g, (_, n) => match[+n + 1] ?? '');
            renamed.push({ oldKey: str, newKey: newStr });
        }
    });

    return { renamed, unchanged };
}

export function validateNoDuplicateColumns(columns) {
    const seen = new Set(), duplicates = new Set();
    for (const col of columns) {
        if (seen.has(col))
            duplicates.add(col);
        else
            seen.add(col);
    }
    if (duplicates.size > 0)
        throw new Error(`Duplicate column names detected: ${[...duplicates].join(', ')}`);
}

/**
 * returns an array of matched strings
 * @param {string[]} list array of strings
 * @param {string} pattern pattern which is to be matched. supports only *
 * @example // examples are from the usecase of this function
 * _.dropRegex("LEFT.*") // columns with "LEFT." prefix are to be dropped
 * _.dropRegex("*__1Qt__*") // column names having "__1Qt__" are to be dropped
 * @returns {string[]}
 */
export function regexMatch(list, pattern) {
    // Escape regex metacharacters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace * with capture group for allowed characters
    const regex = new RegExp('^' + escaped.replace(/\*/g, '(.+?)') + '$');

    return list.filter(str => regex.test(str));
}
