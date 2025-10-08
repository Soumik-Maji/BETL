/**
 * Utility class for rendering styled HTML outputs (tables, error messages, etc.)
 * directly into the document. All methods are static — instantiation is not allowed.
 *
 * The dark theme styles are automatically injected into the page when this class is loaded.
 */
export class HTMLOutput {

    constructor() {
        HTMLOutput.showError("Cannot create object of HTMLOutput. Use it's static functions.");
    }

    static {    // code block runs as soon as this file is loaded
        if (!(document.getElementById("html-output-style"))) {
            const darkStyles = `
                body {
                    background-color: #121212;
                    color: #e0e0e0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    box-shadow: 0 2px 8px rgba(255,255,255,0.05);
                }
                th, td {
                    padding: 12px 15px;
                    border: 1px solid #444;
                    text-align: left;
                }
                th {
                    background-color: #1f3b63;
                    color: white;
                    font-weight: bold;
                }
                tr:nth-child(even) {
                    background-color: #1a1a1a;
                }
                tr:nth-child(odd) {
                    background-color: #222;
                }
                tr:hover {
                    background-color: #2a2a2a;
                }
            `;

            const style = document.createElement("style");
            style.id = "html-output-style";
            style.textContent = darkStyles;
            document.head.appendChild(style);
        }
    }

    /**
     * Creates a styled, collapsible HTML table from an array of objects
     * and appends it to the document body.
     *
     * @param {string} [tableName] - Title for the table shown inside a <summary> element.
     *                               Defaults to `Table <timestamp>` if not provided.
     * @param {Object[]} jsonData - A non-empty array of objects to render.
     *                              Each object represents a row; keys define table columns.
     * @returns {HTMLDetailsElement} The <details> element that contains the generated table.
     *
     * @throws {Error} If `jsonData` is not a non-empty array of objects.
     * @throws {Error} If the provided objects contain no properties.
     *
     * @example
     * HTMLOutput.createTable("Users", [
     *   { id: 1, name: "Alice" },
     *   { id: 2, name: "Bob" }
     * ]);
     *
     * // Renders a styled collapsible table:
     * // > Users ▼
     * // | id | name |
     * // |  1 | Alice|
     * // |  2 | Bob  |
     */
    static createTable(tableName, jsonData) {
        // validating the data
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            HTMLOutput.showError("HTMLOutput.createTable() requires a non-empty array of objects.");
        }

        // start working on table output
        const details = document.createElement("details");
        details.open = true;

        const summary = document.createElement("summary");
        summary.style.cursor = "pointer";
        summary.textContent = tableName || `Table ${Date.now()}`;
        details.appendChild(summary);

        const table = document.createElement("table");

        // table header
        const header = Object.keys(jsonData[0]);
        if (header.length === 0) {
            HTMLOutput.showError("HTMLOutput.createTable() requires objects with at least one property.");
        }
        const headerRow = document.createElement("tr");
        header.forEach(item => {
            const th = document.createElement("th");
            th.textContent = item;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // table rows
        jsonData.forEach(obj => {
            const tr = document.createElement("tr");
            header.forEach(item => {
                const td = document.createElement("td");
                td.textContent = (obj[item] == null) ? "" : obj[item];
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        details.appendChild(table);
        document.body.appendChild(details);
        document.body.appendChild(document.createElement("br"));

        return details;
    }

    /**
     * Displays an error message in the document body inside a 'pre' block,
     * clears existing content and throws an Error.
     *
     * @param {string} [message="Encountered error. Error message not present."] - The error message to display.
     * @throws {Error} Always throws after displaying the message.
     * @returns {never}
     *
     * @example
     * HTMLOutput.showError("Invalid data format.");
     * // Displays stack trace in the browser and throws the error.
     */
    static showError(message = "Encountered error. Error message not present.") {
        const err = new Error(message);

        const pre = document.createElement("pre");
        pre.style.fontWeight = "bolder";
        pre.style.fontSize = "1.05em";
        pre.textContent = err.stack;

        document.body.innerHTML = ""; // clear body before showing error
        document.body.appendChild(pre);

        throw err;
    }
}
