const start = performance.now();

// import { main } from "./tests/new/projects/basic-test.js";
// await main();

// import { main } from "./tests/new/projects/join-test.js";
// await main();

// import { main } from "./tests/new/projects/explode-test.js";
// await main();

// import { main } from "./tests/new/projects/map-test.js";
// await main();

// import { main } from "./tests/new/projects/dedup-test.js";
// await main();

import { main } from "./tests/new/projects/groupby-test.js";
await main();

// import { main  } from "./tests/new/projects/generator-test.js";
// await main();

const end = performance.now();
console.log(`${end - start} ms`);
