import { ObjectArray } from "../../../scripts/ObjectArray.js";
import { readJSON } from "../projects/json-reader.js";

export async function main() {
    const pn = "./tests/new/resource/window-test-data/testing-window.json";
    const pd = "./tests/new/resource/window-test-data/testing-window-DUP_SAL.json";
    const pl = "./tests/new/resource/window-test-data/testing-window-LONG.json";

    const wiNor = ObjectArray.createInstance(await readJSON(pn));
    const wiDup = ObjectArray.createInstance(await readJSON(pd));
    const wiLng = ObjectArray.createInstance(await readJSON(pl));

    wiNor.log();
    wiDup.log();
    wiLng.log();

}
