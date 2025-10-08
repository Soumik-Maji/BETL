import { HTMLOutput } from "../outputs/HTMLOutput.js";

export class RenameMapGenerator {
    static #isConstructorLocked = true;    // lock constructor to make it act like a private constructor

    #renameMap;    // array which contains the rename map for aggregation
    constructor() {
        if (RenameMapGenerator.#isConstructorLocked)
            HTMLOutput.showError("Cannot call RenameMapGenerator with 'new'. Call static function setGroupingColumns().");
        this.#renameMap = [];
        RenameMapGenerator.#isConstructorLocked = true;
    }

    /**
     * @returns new instance of RenameMapGenerator class
     */
    static createInstance() {
        RenameMapGenerator.#isConstructorLocked = false;
        return new RenameMapGenerator();
    }

    /**
     * stacks the old column name & corresponding new column name for later parsing
     * @param {string} oldKey current column name
     * @param {string} newKey new column name
     * @returns RenameMapGenerator instance
     */
    rename(oldKey, newKey) {
        if (this.#renameMap.some(item => item.oldKey === oldKey))
            HTMLOutput.showError(`Cannot rename on column ${oldKey} twice.`);

        if (this.#renameMap.some(item => item.newKey === newKey))
            HTMLOutput.showError(`Cannot rename more than one column ${newKey}.`);

        this.#renameMap.push(Object.freeze({ oldKey, newKey }));
        return this;
    }

    /**
     * make logics immutable & return
     * @returns immutable rename map
     */
    build() {
        return Object.freeze(this.#renameMap);
    }
}
