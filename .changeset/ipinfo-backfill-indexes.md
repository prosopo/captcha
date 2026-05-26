---
"@prosopo/types-database": patch
---

fix(types-database): index the ipInfo / parsedUserAgentInfo backfill queries

The CHECK_IP_INFO and PARSE_USER_AGENT jobs read records via
`getCaptchas({ <field>: { $exists: false } })`, but no index covered
either predicate on `PoWCaptchaRecordSchema`, `PuzzleCaptchaRecordSchema`,
or `UserCommitmentRecordSchema`. The existing `ipInfo.countryCode` and
`ipInfo.isVPN` indexes only contain rows where `ipInfo` already exists,
so they actively can't help the "missing" query — both jobs were running
COLLSCANs.

Add partial indexes keyed on `_id` with
`partialFilterExpression: { <field>: { $exists: false } }` to each of the
three schemas (six new indexes total). Partial filters exactly matching
the query predicate allow the planner to use the index. The index stays
small because it only contains un-enriched rows, shrinks as the backfill
progresses, and is essentially empty once the request-time middleware has
populated every new row.

Note: `CaptchaDatabase.ensureIndexes()` drops then recreates all indexes
on each collection, so applying these in production will rebuild every
existing index on `commitment`, `powcaptcha`, and `puzzlecaptcha` —
schedule during a maintenance window or build only the new partial
indexes directly via `createIndex` on the live cluster.
