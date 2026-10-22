---
"@prosopo/types-database": patch
"@prosopo/database": patch
---

Extend the Rust mongoose engine for the private database port: it now builds a stored document the way mongoose hydrates a query result (defaults, key order and projections included), builds a findOneAndReplace replacement, handles maps of plain values, and the Rust database can send a raw command and return mongod's whole reply. The TypeScript is unchanged.
