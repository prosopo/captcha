---
"@prosopo/database": patch
---

Add the first slice of a Rust port of the database package, `prosopo-database`: the connection options and the Mongo connection itself, with the database URL built exactly as the TypeScript builds it. Its logs mask the whole Mongo password, where the TypeScript's masking can leave part of it visible. The TypeScript is unchanged.
