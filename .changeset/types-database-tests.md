---
"@prosopo/types-database": patch
---

Add unit and type tests for the mongoose schemas, and drop the duplicate single-field indexes on the banned-domain and spam-email-domain collections, which the unique constraint already provides.
