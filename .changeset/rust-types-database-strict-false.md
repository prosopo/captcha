---
"@prosopo/types-database": patch
---

The Rust mongoose engine can cast an update with `strict: false`, keeping the paths a schema does not declare, as database-private's label writes need. The TypeScript is unchanged.
