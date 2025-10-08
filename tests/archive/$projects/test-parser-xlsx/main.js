import { XLSX2JSON } from "../../scripts/parsers/xlsx/XLSX2JSON.js";
import { HTMLInput } from "../../scripts/inputs/HTMLInput.js";

async function main() {

    // let xlsxData = await XLSX2JSON.readFile("test-book.xlsx");
    let xlsxData = await XLSX2JSON.readFile("./test-book.xlsx");

    // console.log("All sheet names: ", xlsxData.getAllSheetNames());

    let jsonData = await xlsxData.setSheetName("Sheet1")
        // .hasNoHeader()
        // .relaxValidation()
        .setColumnBounds("B", "E").setRowStart(5)
        .load();
    // display(jsonData);

    jsonData = await xlsxData.setSheetName("Sheet1")
        .setColumnBounds("g", "k").setRowStart(3)
        .load();
    display(jsonData);


    function display(data) {
        console.table(data);
        document.getElementById("op").innerText = JSON.stringify(data, null, 2);
    }
}

// const fin = HTMLInput.createFileInput("fin");
document.getElementById("btn").addEventListener("click", main);
document.getElementById("btn").click();
