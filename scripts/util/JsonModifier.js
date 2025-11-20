/*
    NOTE FOR PORXY -
    the idea of proxies is like this :
    an object obj is passed to a function to get proxied
    the function returns the same object with porxies applied on it
    when we do something related to the proxy on the original, it will be unaffected as it is not getting trapped by the proxies
    but when we do something related to the proxy on the return value of the proxy applying function then it will be trapped
    so, the idea is the object it self is not getting proxied, but the reference returned by it will have the proxy wrapper on it
    ONE THING TO REMEMBER is the object is not cloned or shallow copied
*/

/**
 * - Wraps the object with get, delete, set & modify traps.
 * - Creates a shallow copy for the objects inside array (because of map function) to wrap it with proxies & then freeze it.
 * - Currently works for my usecases, but still very fragile by design.
 */
export class JsonModifier {

    constructor() {
        throw new Error("Cannot create object of JsonModifier. Use the static functions - arrayOfObjectsProxy() or objectProxy().");
    }

    /**
     * apply get, delete, set & modify proxy on the objects in an array of objects
     * and return a freezed version of array
     * @param {Array} arrayData
     * @returns original array of objects with the proxy applied on objects
     */
    static arrayOfObjectsProxy(arrayData, {
        getProxy = true,
        deleteProxy = true,
        setProxy = true,
        modifyProxy = true
    } = {}) {
        return Object.freeze(
            arrayData.map(item =>
                JsonModifier.objectProxy(item, { getProxy, deleteProxy, setProxy, modifyProxy })
            )
        );
    }

    /**
     * apply get, delete, set & modify proxy on the provided object
     * @param {Object} obj target object on which proxy is to be applied
     * @param {options} param1 options parameter. by default everything is "true"
     * @returns original object with the proxy applied on it
     */
    static objectProxy(obj, {
        getProxy = true,
        deleteProxy = true,
        setProxy = true,
        modifyProxy = true
    } = {}) {
        return new Proxy(obj, {
            get(obj, prop) {
                if (getProxy && !(obj.hasOwnProperty(prop)))
                    throw new Error(`'${prop}' property not present in object.`);
                return Reflect.get(obj, prop, obj);
            },

            deleteProperty(obj, prop) {
                if (deleteProxy) {
                    if (!(obj.hasOwnProperty(prop)))
                        throw new Error(`No '${prop}' property to delete from object.`);

                    throw new Error(`Cannot delete '${prop}' property of the object.`);
                }
                return Reflect.deleteProperty(obj, prop);
            },

            set(obj, prop, newVal) {
                const isPropertyAvailable = obj.hasOwnProperty(prop);
                if (setProxy && !isPropertyAvailable)
                    throw new Error(`Cannot create new property '${prop}'.`);

                if (modifyProxy && isPropertyAvailable)
                    throw new Error(`Cannot modify property '${prop}' here.`)

                return Reflect.set(obj, prop, newVal, obj);
            }
        });
    }
}
