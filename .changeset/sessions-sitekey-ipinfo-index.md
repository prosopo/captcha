---
"@prosopo/types-database": patch
---

Declare the `sessions` `{ siteKey, ipInfo.ip }` index on `SessionRecordSchema`. It already exists in production, created by hand, so other environments run per-IP session lookups as a collection scan.
