---
"@prosopo/types-database": patch
---

fix(types-database): replace broken partial indexes with regular non-sparse indexes for CHECK_IP_INFO / PARSE_USER_AGENT backfill queries

The original partial-index approach (#2587, then #2589) couldn't work in MongoDB:

- `partialFilterExpression` isn't allowed on `_id` indexes (caught by #2589).
- More fundamentally, `{ $exists: false }` is rewritten internally as `$not: { $exists: true }`, and `$not` isn't on the partial-filter operator allowlist either. So no key field could rescue the partial-index design.

Replace the six broken partial-index definitions on `PoWCaptchaRecordSchema`, `PuzzleCaptchaRecordSchema`, and `UserCommitmentRecordSchema` with regular non-sparse indexes on the fields themselves (`{ ipInfo: 1 }` and `{ parsedUserAgentInfo: 1 }`). Non-sparse indexes include entries for missing-field documents (stored as null), which the planner can use to satisfy `{ <field>: { $exists: false } }` via `IXSCAN`.

Note: both layers that swallowed the original `createIndex` failures (`CaptchaDatabase.ensureIndexes()` `.catch` warning, and Mongoose `autoIndex`'s un-listened `'index'` event) are still silent — worth a follow-up so the next bad schema change doesn't ship unnoticed.
