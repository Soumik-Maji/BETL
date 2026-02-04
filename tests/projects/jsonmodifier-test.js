import { JsonModifier } from "../../../scripts/util/JsonModifier.js";

export function main() {
    // empid, name, role, managerid
    const data = [
        {
            "empid": "1",
            "name": "Sally",
            "role": "backend",
            "managerid": ""
        },
        {
            "empid": "2",
            "name": "Josh",
            "role": "frontend",
            "managerid": "1"
        },
        {
            "empid": "3",
            "name": "Becky",
            "role": "database",
            "managerid": "5"
        },
        {
            "empid": "4",
            "name": "Bob",
            "role": "backend",
            "managerid": "1"
        },
        {
            "empid": "5",
            "name": "Eric",
            "role": "database",
            "managerid": "1"
        },
        {
            "empid": "6",
            "name": "Rose",
            "role": "backend",
            "managerid": "4"
        }
    ];
    const obj = data[0];

    let modified = JsonModifier.objectProxy(obj);

    // ALL PROXY TRAPPING - TRUE
    console.log(modified.empid);
    // console.log(modified.empi); // accessing prop not present. error - OK

    // delete modified.empid;   // deleting present prop. error - OK
    // delete modified.empi;    // deleting absent prop. error - OK

    // modified.empid = 40;     // modifying prop. error - OK
    // modified.empi = 40;      // setting new prop . error - OK

    // SET PROXY TRAPPING CHECK
    modified = JsonModifier.objectProxy(obj, {
        modifyProxy: false, // toggle checks are working
        setProxy: false     // fine for both these proxies
    });
    modified.empid = 40;    // modifying prop. error - OK
    modified.empi = 40;     // setting new prop . error - OK

    // console.table(modified);

    // GET PROXY TRAPPING CHECK
    modified = JsonModifier.objectProxy(obj, {
        getProxy: false
    });
    // console.log(modified.name);  // toggle check for get proxy working fine

    // DELETE PROXY TRAPPING CHECK
    modified = JsonModifier.objectProxy(obj, {
        deleteProxy: false
    });
    delete modified.name;   // toggle check for delete proxy working fine

    // console.table(modified);

}
