import { ObjectArray } from "../../scripts/ObjectArray.js";
import { AppendGenerator } from "../../scripts/util/manipulator-functions/appending.js";

export function main() {
    const data = [
        { "01-Jan_EndIng": "12:45pm", "02-Jan_EndIng": "12:34pm", "Name": "nel" },
        { "01-Jan_EndIng": "02:05am", "02-Jan_EndIng": "01:54am", "Name": "nop" }
    ];

    const a = ObjectArray.createInstance(data)
        .log()
        // .selectRegex("*_end")
        // .dropRegex("*_end")
        // .renameRegex("*_EndIng", "$0")

        .renameAll(item => item.toLowerCase())
        .log()
        ;

    console.log(a.columns);
}
