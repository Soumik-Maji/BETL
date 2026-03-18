import { ObjectArray } from "../../index.js";

// -- DATA TO WORK WITH --
const nitishDataJSON = [
    {
        "table": "cust_pref_hist",
        "max_date": "2024-05-27 14:23:52.803",
        "count": 54474435
    },
    {
        "table": "cust_soc_media_email",
        "max_date": "2026-02-24 06:20:48.392",
        "count": 623
    },
    {
        "table": "customer_email_address_azure",
        "max_date": "2026-02-25 15:08:11",
        "count": 6917104
    },
    {
        "table": "dealership",
        "max_date": "2026-02-27 12:23:34.347",
        "count": 10784
    },
    {
        "table": "hst_cust_azure_email",
        "max_date": "2024-05-27 14:31:03.393",
        "count": 6459290
    },
    {
        "table": "hst_email_domain",
        "max_date": "2026-02-27 07:02:21",
        "count": 162600
    },
    {
        "table": "hst_event_participation",
        "max_date": "2026-02-26 19:53:53",
        "count": 132022986
    },
    {
        "table": "merged_customer",
        "max_date": "2026-02-25 14:23:30.595",
        "count": 11677935
    },
    {
        "table": "non_customer",
        "max_date": "2026-02-25 14:31:10.129",
        "count": 46814
    },
    {
        "table": "non_customer_party",
        "max_date": "2026-02-24 06:20:16.773",
        "count": 1
    },
    {
        "table": "raw_customer_pi",
        "max_date": "2026-02-27 06:59:03",
        "count": 4660124
    },
    {
        "table": "raw_transaction",
        "max_date": "2026-02-27 06:48:47",
        "count": 4482398
    },
    {
        "table": "rtsl_batch_address",
        "max_date": "2026-02-27 12:24:28.163",
        "count": 135924600
    },
    {
        "table": "rtsl_batch_customer",
        "max_date": "2026-02-27 12:32:03.804",
        "count": 277112037
    },
    {
        "table": "rtsl_batch_email",
        "max_date": "2026-02-27 12:43:52.621",
        "count": 62576692
    },
    {
        "table": "rtsl_batch_event",
        "max_date": "2026-02-27 12:46:40.389",
        "count": 313899016
    },
    {
        "table": "src_aot",
        "max_date": "2026-02-27 13:07:32.648",
        "count": 1313838
    },
    {
        "table": "wrk_dealer_assignment",
        "max_date": "2026-02-26 19:52:14.248",
        "count": 29995863
    }
];
const qlikDataJSON = [
    {
        "filename": "CDB_PROD.CUST_PREF_HIST/",
        "modificationTime": "2026-02-18 22:42:44"
    },
    {
        "filename": "CDB_PROD.CUST_PREF_HIST__ct/",
        "modificationTime": "2026-03-04 09:38:50"
    },
    {
        "filename": "CDB_PROD.CUST_SOC_MEDIA_EMAIL/",
        "modificationTime": "2026-02-18 21:56:54"
    },
    {
        "filename": "CDB_PROD.CUST_SOC_MEDIA_EMAIL__ct/",
        "modificationTime": "2025-12-24 03:08:09"
    },
    {
        "filename": "CDB_PROD.CUSTOMER_EMAIL_ADDRESS_AZURE/",
        "modificationTime": "2026-02-18 20:09:42"
    },
    {
        "filename": "CDB_PROD.CUSTOMER_EMAIL_ADDRESS_AZURE__ct/",
        "modificationTime": "2026-03-04 12:20:12"
    },
    {
        "filename": "CDB_PROD.DEALERSHIP/",
        "modificationTime": "2026-02-18 21:56:59"
    },
    {
        "filename": "CDB_PROD.DEALERSHIP__ct/",
        "modificationTime": "2026-02-27 11:23:45"
    },
    {
        "filename": "CDB_PROD.HST_CUST_AZURE_EMAIL/",
        "modificationTime": "2026-02-19 02:10:56"
    },
    {
        "filename": "CDB_PROD.HST_CUST_AZURE_EMAIL__ct/",
        "modificationTime": "1969-12-31 23:59:59"
    },
    {
        "filename": "CDB_PROD.HST_EMAIL_DOMAIN/",
        "modificationTime": "2026-02-18 20:48:42"
    },
    {
        "filename": "CDB_PROD.HST_EVENT_PARTICIPATION/",
        "modificationTime": "2026-02-19 04:54:35"
    },
    {
        "filename": "CDB_PROD.HST_EVENT_PARTICIPATION__ct/",
        "modificationTime": "2026-03-04 09:38:51"
    },
    {
        "filename": "CDB_PROD.HST_NON_CUSTOMER/",
        "modificationTime": "2026-02-19 02:17:13"
    },
    {
        "filename": "CDB_PROD.HST_NON_CUSTOMER__ct/",
        "modificationTime": "2025-12-18 12:31:39"
    },
    {
        "filename": "CDB_PROD.HST_NON_CUSTOMER_PARTY/",
        "modificationTime": "2026-02-19 02:17:21"
    },
    {
        "filename": "CDB_PROD.HST_NON_CUSTOMER_PARTY__ct/",
        "modificationTime": "2026-03-04 03:05:51"
    },
    {
        "filename": "CDB_PROD.HST_PMA_DEALERSHIP/",
        "modificationTime": "2026-02-19 02:31:25"
    },
    {
        "filename": "CDB_PROD.HST_PMA_DEALERSHIP__ct/",
        "modificationTime": "2026-03-04 04:27:12"
    },
    {
        "filename": "CDB_PROD.HST_PREFERRED_DEALERSHIP/",
        "modificationTime": "2026-02-19 02:32:11"
    },
    {
        "filename": "CDB_PROD.HST_PREFERRED_DEALERSHIP__ct/",
        "modificationTime": "2026-03-03 06:23:20"
    },
    {
        "filename": "CDB_PROD.MERGED_CUSTOMER/",
        "modificationTime": "2026-02-19 03:40:16"
    },
    {
        "filename": "CDB_PROD.MERGED_CUSTOMER__ct/",
        "modificationTime": "2026-03-04 04:33:06"
    },
    {
        "filename": "CDB_PROD.NON_CUSTOMER/",
        "modificationTime": "2026-02-19 03:40:27"
    },
    {
        "filename": "CDB_PROD.NON_CUSTOMER__ct/",
        "modificationTime": "2026-03-03 21:35:56"
    },
    {
        "filename": "CDB_PROD.NON_CUSTOMER_PARTY/",
        "modificationTime": "2026-02-19 03:40:30"
    },
    {
        "filename": "CDB_PROD.NON_CUSTOMER_PARTY__ct/",
        "modificationTime": "2026-01-29 18:09:43"
    },
    {
        "filename": "CDB_PROD.PMA_DEALERSHIP/",
        "modificationTime": "2026-02-19 06:03:27"
    },
    {
        "filename": "CDB_PROD.PMA_DEALERSHIP__ct/",
        "modificationTime": "2026-03-04 04:33:06"
    },
    {
        "filename": "CDB_PROD.PREFERRED_DEALERSHIP/",
        "modificationTime": "2026-02-19 06:05:44"
    },
    {
        "filename": "CDB_PROD.PREFERRED_DEALERSHIP__ct/",
        "modificationTime": "2026-03-04 04:28:06"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_ADDRESS/",
        "modificationTime": "2026-02-19 08:30:50"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_ADDRESS__ct/",
        "modificationTime": "2026-02-25 14:56:59"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_CUSTOMER/",
        "modificationTime": "2026-02-19 11:54:52"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_CUSTOMER__ct/",
        "modificationTime": "2026-02-27 05:46:57"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_EMAIL/",
        "modificationTime": "2026-02-19 08:17:39"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_EMAIL__ct/",
        "modificationTime": "2026-02-16 10:46:36"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_EVENT/",
        "modificationTime": "2026-02-19 14:39:05"
    },
    {
        "filename": "CDB_PROD.RTSL_BATCH_EVENT__ct/",
        "modificationTime": "2026-02-27 06:01:02"
    },
    {
        "filename": "CDB_RAW.RAW_CUSTOMER_PI/",
        "modificationTime": "2026-02-19 12:08:06"
    },
    {
        "filename": "CDB_RAW.RAW_CUSTOMER_PI__ct/",
        "modificationTime": "2026-03-04 12:34:37"
    },
    {
        "filename": "CDB_RAW.RAW_TRANSACTION/",
        "modificationTime": "2026-02-19 12:12:49"
    },
    {
        "filename": "CDB_RAW.RAW_TRANSACTION__ct/",
        "modificationTime": "2026-03-04 12:34:37"
    },
    {
        "filename": "CDB_REFRESH.SRC_AOT/",
        "modificationTime": "2026-02-19 12:09:39"
    },
    {
        "filename": "CDB_REFRESH.SRC_AOT__ct/",
        "modificationTime": "1969-12-31 23:59:59"
    },
    {
        "filename": "CDB_REFRESH.WRK_DEALER_ASSIGNMENT/",
        "modificationTime": "2026-02-19 12:40:04"
    },
    {
        "filename": "CDB_REFRESH.WRK_DEALER_ASSIGNMENT__ct/",
        "modificationTime": "2026-03-04 04:31:37"
    }
];
// -- DATA TO WORK WITH --

// -- ORIGINAL CODE FAILURE TEST --
export async function main() {
    // console.log(nitishDataJSON.length);
    // console.log(qlikDataJSON.length);

    const nd = ObjectArray.createInstance(nitishDataJSON).log();
    const qd = ObjectArray.createInstance(qlikDataJSON).log();

    qd.fullJoin(nd, (l, r) => (l.filename.toLowerCase()).includes(r.table.toLowerCase()))
        .log();

}
// -- ORIGINAL CODE FAILURE TEST --


// -- ORIGINAL CODE --
// async function getOA(data) {
//     const fileData = await ReadFile.from(ReadFile.Strategy.RawString, data).getString();
//     const rawData = CSV2JSON.from(fileData).setColumnSeparator("\t").load();
//     return ObjectArray.createInstance(rawData.data)
//         .log()
//         ;
// }

// export async function main() {
//     const nd = await getOA(nitishData);
//     const qd = await getOA(qlikData);

//     const result = qd.innerJoin(nd, (l, r) => (l.filename.toLowerCase()).includes(r.table.toLowerCase()))
//         .log()
//         ;

//     // document.body.innerHTML = Exporter.toHTML(result.execute().data).result;
//     Exporter.toXLS(result.execute().data).download("joined.xls");
// }
// -- ORIGINAL CODE --
