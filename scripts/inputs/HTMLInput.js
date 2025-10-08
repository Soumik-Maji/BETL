import { HTMLOutput } from "../outputs/HTMLOutput.js";

/**
 * Utility class for creating and inserting common HTML input elements
 * (`<input type="file">`, `<textarea>`, and `<button>`) into the DOM.
 *
 * This class cannot be instantiated — all methods are static.
 * Each method validates the provided `id` and appends the created element
 * directly to `document.body`, followed by a line break (`<br>`).
 */
export class HTMLInput {

    constructor() {
        HTMLOutput.showError("Cannot create object of HTMLInput. Use it's static functions.");
    }

    /**
     * Validates and assigns an ID to an element if provided.
     * @private
     * @param {HTMLElement} htmlElm - The element to assign the ID to.
     * @param {string} [id] - Optional ID for the element. Must be a string if provided.
     */
    static #setId(htmlElm, id) {
        if (id !== undefined && typeof id !== "string")
            HTMLOutput.showError(`HTMLInput.create...() ${htmlElm.tagName} element requires id to be String or omitted.`)
        if (id)
            htmlElm.id = id;
    }

    /**
     * Creates an <input type="file"> element and appends it to the document body.
     * @param {string} [id] - Optional ID for the input element. Must be a string if provided.
     * @returns {HTMLInputElement} The created file input element.
     *
     * @example
     * const fileInput = HTMLInput.createFileInput("uploadFile");
     */
    static createFileInput(id) {
        const input = document.createElement("input");
        input.type = "file";
        HTMLInput.#setId(input, id);

        document.body.appendChild(input);
        document.body.appendChild(document.createElement("br"));
        return input;
    }

    /**
     * Creates a <textarea> element (default size: cols=50, rows=10) and appends it to the document body.
     * @param {string} [id] - Optional ID for the textarea element. Must be a string if provided.
     * @returns {HTMLTextAreaElement} The created textarea element.
     *
     * @example
     * const notes = HTMLInput.createTextAreaInput("notesField");
     */
    static createTextAreaInput(id) {
        const input = document.createElement("textarea");
        input.cols = "50";
        input.rows = "10";
        HTMLInput.#setId(input, id);

        document.body.appendChild(input);
        document.body.appendChild(document.createElement("br"));
        return input;
    }

    /**
     * Creates a <button> element with the given text and appends it to the document body.
     * @param {string} [id] - Optional ID for the button element. Must be a string if provided.
     * @param {string} [buttonDisplay="Run"] - The text content to display inside the button.
     * @returns {HTMLButtonElement} The created button element.
     *
     * @example
     * const runBtn = HTMLInput.createStartingButton("startBtn", "Start Process");
     */
    static createStartingButton(id, buttonDisplay = "Run") {
        const input = document.createElement("button");
        input.textContent = buttonDisplay;
        HTMLInput.#setId(input, id);

        document.body.appendChild(input);
        document.body.appendChild(document.createElement("br"));
        return input;
    }
}
