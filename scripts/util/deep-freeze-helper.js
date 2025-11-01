export function deepFreeze(data, visited = new WeakSet()) {
    if (data === null || typeof data !== "object")
        return data;

    if (visited.has(data))
        return data;

    visited.add(data);
    Object.freeze(data);    // freeze the data itself

    // works on both objects & arrays
    const keys = Object.keys(data), len = keys.length;
    for (let i = 0; i < len; i++)
        deepFreeze(data[keys[i]], visited);

    return data;
}
