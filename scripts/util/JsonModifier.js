/*
    JsonModifier is inconsistent with how it handles array vs objects.
    At least made the calls to this consistent, by not cloning the data sent to it.
    Current implementation may change how the actual data is accessed & modified.
    BUT BUT BUT... till now didn't see the issue, don't know why or how.
    Consult bhai to understand it better.
*/

export class JsonModifier {

    constructor() {
        throw new Error("Cannot create object of JsonModifier. Use it's static functions.");
    }

    /**
     * apply get, set, delete proxy on the objects in an array of objects
     * @param {Array} arrayData
     * @returns original array of objects with the proxy applied on objects
     */
    static arrayOfObjectsProxy(arrayData, {
        getProxy = true,
        deleteProxy = true,
        setProxy = true,
        modifyProxy = true
    } = {}) {
        return Object.freeze(arrayData)
            .map(item => JsonModifier.objectProxy(item, { getProxy, deleteProxy, setProxy, modifyProxy }));
    }

    /**
     * apply get, set, delete proxy on the provided object
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
                if (setProxy && (modifyProxy || !(obj.hasOwnProperty(prop)))) {
                    throw new Error(`Cannot set new value for '${prop}' here.`)
                }
                return Reflect.set(obj, prop, newVal, obj);
            }
        })
    }
}
