import { XML2JSON } from "../../scripts/parsers/xml/XML2JSON.js";
import { HTMLInput } from "../../scripts/inputs/HTMLInput.js";

async function main() {

    // const testXML = `<pulltimestamp id="sdk" calc="pol-56">23:45</pulltimestamp>`;
    // const testXML = '<tst><job id="1"><name>opr-q1</name><starttime>12:15</starttime><status>success</status></job></tst>';
    // const testXML = `<chunk demo="true" id="root-node"><job id="1"><name>opr-q1</name><starttime>12:15</starttime><status>success</status></job><run><name>run1</name></run><job id="2"><name>akli</name><starttime>22:37</starttime><status>failed</status></job><run><name>run2</name></run><job id="3"><name>dso</name><starttime>02:26</starttime><status>running</status></job><job id="4"><name>vlxs</name><starttime>14:09</starttime><status>success</status></job><run><name id="dod">run3</name></run><author id="auto-none-2155" num="chk"><id>none</id><name>Automated</name></author><pulltimestamp>23:45</pulltimestamp></chunk>`;

    // const xml2json = await XML2JSON.readFile(testXML);
    // const xml2json = await XML2JSON.readFile(tin);
    // const xml2json = await XML2JSON.readFile(fin);
    const xml2json = await XML2JSON.readFile("test.xml");

    const jsonResult = xml2json
        .preserveAttributes()
        .load();

    document.getElementById("op").innerText = JSON.stringify(jsonResult, null, 2);

    const json2 = xml2json.load();
    document.getElementById("op").innerText +=
        "\n-----------------------------------------------\n"
        + JSON.stringify(json2, null, 2);
}

// const tin = HTMLInput.createTextAreaInput("tin");
// const fin = HTMLInput.createFileInput("fin");
document.getElementById("btn").addEventListener("click", main);
document.getElementById("btn").click();
