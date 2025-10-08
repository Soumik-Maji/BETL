import { HTMLOutput } from "../outputs/HTMLOutput.js";

export class JsonModifier {

    constructor() {
        HTMLOutput.showError("Cannot create object of JsonModifier. Use it's static functions.");
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
        return arrayData.map(item => JsonModifier.objectProxy(item, { getProxy, deleteProxy, setProxy, modifyProxy }));
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
                    HTMLOutput.showError(`'${prop}' property not present in object.`);
                return Reflect.get(obj, prop, obj);
            },

            deleteProperty(obj, prop) {
                if (deleteProxy) {
                    if (!(obj.hasOwnProperty(prop)))
                        HTMLOutput.showError(`No '${prop}' property to delete from object.`);

                    HTMLOutput.showError(`Cannot delete '${prop}' property of the object.`);
                }
                return Reflect.deleteProperty(obj, prop);
            },

            set(obj, prop, newVal) {
                if (setProxy && (modifyProxy || !(obj.hasOwnProperty(prop)))) {
                    HTMLOutput.showError(`Cannot set new value for '${prop}' here.`)
                }
                return Reflect.set(obj, prop, newVal, obj);
            }
        })
    }
}
