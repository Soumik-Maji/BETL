# ShiTL tool 
why use ETL written in JS for repetitive task, when you can use Excel like a true 10x dev? 😉

This is somewhat an ETL tool written in JavaScript.

For now it has the following capabilities:
- read structured data from CSV (custom delimiters) & array of javascript objects
- convert one form to another
- de-duplication as per provided column names like in excel [I too need inspiration]
- sorting of whole array as per provided function (normal JS stuff)
- mapping array of objects as per provided columns names -> mapping(tgt, [tgc1, tgc2, ...], src, [srcc1, srcc2, ...]) - length of target columns array & source columns array should be same else ERROR
- simple transformation functions on single columns like date formatting, calculating percentage from VALUE&TOTAL columns, etc

Other functions because I know to display stuff using HTML & JS only:
- can display the data on html page as table for structured data (for now)
- can copy the structured data into a string as tab separated (maybe add custom column separator)

Later additions:
- maybe include just objects with keys (primary) [delimited keys for composite as well]
- parsing semi-structured data from CSV & object array data
- other file formats like excel, parquets, etc.
