/*
    NOTE TO SELF:
    START vscode live-server on index.test.html
    IT WILL USE index.test.js FOR TESTING
    I CAN NOW PUT THE TESTING CODE IN ./tests/new/projects/{rest_of_testing_file_path}
    CALL THEN FROM index.test.js FOR CONSOLE TESTING IN BROWSER
    CHECK HOW json-reader.js IS USED CURRENTLY

    FROM HERE ON CREATE A SEPARATE BRANCHES FOR EVERY CODE CHANGE IN MAIN PEOJECT,
    TO KEEP THIS TILL HERE CLEAN

    UNEXPECTED BENEFIT: CALLING FOR RESOURCE (JSONs) FROM TESTING FOLDER NOW USES ABSOLUTE PATH
*/

import { devTest } from "./tests/new/projects/json-reader.js";

await devTest();
