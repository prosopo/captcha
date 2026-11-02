---
"@prosopo/database": minor
---

Add `reconcileIndexes`, which brings a collection's indexes in line with its schema. Mongoose's own `ensureIndexes`/autoIndex cannot change an existing index: when a declared index's key or options change (for example `pendingStage_partial` gaining `_id`, or a field becoming unique) it logs an error and leaves the old index in place, so the new one never appears. `reconcileIndexes` drops and rebuilds only those clashing indexes, puts the old one back if the rebuild fails (for example a new unique index meeting duplicates), can drop named obsolete indexes, can keep extra indexes declared outside the schema, and has a dry-run mode.

The provider's `ensureIndexes` now uses it on its own database (dropping indexes the schema no longer declares). The central captcha database uses it too, but keeps indexes it does not know about, since other services add their own there.
