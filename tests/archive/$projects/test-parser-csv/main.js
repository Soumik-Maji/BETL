import { CSV2JSON } from "../../scripts/parsers/csv/CSV2JSON.js";
import { HTMLInput } from "../../scripts/inputs/HTMLInput.js";

async function main() {
    // const csv2json = await CSV2JSON.readFile(textAreaInput);
    // const csv2json = await CSV2JSON.readFile(fileInput);
    const csv2json = await CSV2JSON.readFile("text.csv");

    const jsonResult = csv2json
        .setSkipFirstNLines(1)
        // .setTextQualifier('"')
        .load();

    console.log(jsonResult.rejects);
    console.table(jsonResult.data);

    document.getElementById("op").innerText = JSON.stringify(jsonResult, null, 2);

    const json2 = csv2json.setSkipFirstNLines(19).load();
    console.log(json2.rejects);
    console.table(json2.data);
}

// const textAreaInput = HTMLInput.createTextAreaInput("tin");
// const fileInput = HTMLInput.createFileInput("fin");
document.getElementById("btn").addEventListener('click', main);
document.getElementById("btn").click();
