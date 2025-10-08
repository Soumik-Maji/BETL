import { JsonModifier } from "../../scripts/json-modifier/JsonModifier.js";
import { CSV2JSON } from "../../scripts/parsers/csv/CSV2JSON.js";

const csv = await CSV2JSON.readFile("../../resource/test-data/fake-details-SHORT.csv")
const jsonData = csv.setColumnSeparator("|").load().data;
console.table(jsonData[0]);

const modifiedJson = JsonModifier.arrayObjectProxy(jsonData);

console.log("-----------------------------");

// CHECKING GETTER
console.log(modifiedJson[0].jobname);
// console.log(modifiedJson[0].host);

// CHECKING DELETE
// delete modifiedJson[0].jobname;
// delete modifiedJson[0].host;

// CHECKING SETTER EFFECT ON ORIGINAL
// jsonData[0].oriTest = "OriTest";
// modifiedJson[0].ModTest = "ModTest";

// console.table(jsonData[0]);
// console.table(modifiedJson[0]);
