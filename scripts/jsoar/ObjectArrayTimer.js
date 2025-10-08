import { ObjectArray } from "./ObjectArray.js";

export class ObjectArrayTimer extends ObjectArray {

    constructor(data) {
        super(data);
        return new Proxy(this, handler);
    }
}

const handler = {
    get(target, propKey) {
        const originalMethod = target[propKey];
        if (typeof originalMethod === 'function' && propKey !== 'constructor') {
            return function (...args) {
                const start = performance.now();

                const result = originalMethod.apply(target, args);

                const end = performance.now();
                console.log(`'${propKey}' took ${(end - start).toFixed(2)} ms`);

                return new ObjectArrayTimer(result.data);
            };
        }
        return originalMethod;
    }
};
