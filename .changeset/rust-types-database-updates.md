---
"@prosopo/types-database": patch
"@prosopo/logger": patch
---

Teach the Rust port of the database schemas to build updates and filters exactly as mongoose sends them for `updateOne`, `updateMany`, `bulkWrite` and `findOneAndUpdate`, checked byte for byte against the commands a real mongod received. The Rust logger now exports its JS number formatting for this. The TypeScript is unchanged.
