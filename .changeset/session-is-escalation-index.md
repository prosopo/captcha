---
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/provider": patch
---

Add a sparse compound index on `{ isEscalation: 1, createdAt: 1 }` to the Session collection. Sparse so ordinary frictionless sessions (which omit the field) don't add index entries.
