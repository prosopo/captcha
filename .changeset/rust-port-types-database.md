---
"@prosopo/types-database": patch
"@prosopo/types": patch
---

Add a Rust port of the types-database schemas, `prosopo-types-database`: every mongoose schema declared field for field, a builder that produces the exact document mongoose would store for a record (key order, defaults, subdocument ids, BSON number types and validation), and each schema's indexes, all checked byte for byte against mongoose and a real mongod. The Rust types gain the stored-record enums, and their JS number now keeps `-0` a double in BSON as js-bson does. The TypeScript is unchanged.
