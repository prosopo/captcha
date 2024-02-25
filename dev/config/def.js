import { createRequire } from 'module';

// Create a require function compatible with ESM
const require2 = createRequire(import.meta.url);

// Import the module using require
const myModule = require2('./ghi/abc.js');

// Now you can access the exported properties or functions
console.log(myModule.abc); // This should output 'abc'