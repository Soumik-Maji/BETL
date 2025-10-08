import { HTMLInput } from "../../scripts/inputs/HTMLInput.js";
import { JSON2JSON } from "../../scripts/parsers/json/JSON2JSON.js";

async function main() {
    console.log("started");

    // const json = await JSON2JSON.readFile(fin);
    const json = (await JSON2JSON.readFile("test.json")).load();

    console.table(json);
    console.log(json);
}

// const fin = HTMLInput.createFileInput();
// const tain = HTMLInput.createTextAreaInput();
const btn = HTMLInput.createStartingButton();

btn.addEventListener("click", main);
btn.click();
