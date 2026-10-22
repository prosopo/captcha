---
"@prosopo/types-database": patch
---

The Rust schema check describes a path's TTL `expires` in seconds, as mongoose builds the index, so a timespan such as "7d" compares with the Rust schema.
