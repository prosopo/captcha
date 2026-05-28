---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/provider": patch
---

fix: replace `$or + $expr` unstored-records sweep with a `pendingStage` sentinel

The `StoreCommitmentsExternal` background job fetches "records that still
need to be shipped to the central DB" via
`{ $or: [ { storedAtTimestamp: { $exists: false } }, { $expr: { $lt: [$storedAtTimestamp, $lastUpdatedTimestamp] } } ] }`.
`$expr` is unindexable (per-doc computation) and combined with `$or`
defeats the planner entirely — production was running this every sweep
as a `IXSCAN { _id: 1 }` collection scan, examining ~673K powcaptcha
docs, ~240K usercommitments docs, and ~60K sessions docs per pass. On
the worst-affected nodes this thrashed the WiredTiger cache (10h of
cumulative app-thread blocking on disk reads in 43h of uptime) and made
every other Mongo lookup (including the frictionless session dedup
queries) slow by eviction — manifesting as traffic-correlated provider
latency starting 2026-05-26.

Replace the query semantics with a `pendingStage: true` sentinel:

- New optional `pendingStage` field on `StoredCaptcha` and `Session`
  (Zod + TS + Mongoose schemas).
- New tiny partial index per collection:
  `{ pendingStage: 1 }` with `partialFilterExpression: { pendingStage: true }`.
  Indexes only the rows that need staging — typically a tiny rolling set,
  ~20 KB for a 700K-row collection with 100 pending rows in local tests.
- Write paths (`storeXxx`, `updateXxx`, `markXxxChecked`, approve /
  disapprove, `checkAndRemoveSession`, `recordSessionSimdReadingsIfAbsent`,
  `storePendingImageCommitment`) set `pendingStage: true` alongside the
  existing `lastUpdatedTimestamp` bump.
- `markXxxStored` and the per-record streamer mark-stored callbacks
  `$unset: { pendingStage: 1 }` alongside the `storedAtTimestamp` write,
  guarded by `lastUpdatedTimestamp: { $lte: ts }` so an in-flight update
  doesn't get its pending flag cleared by an older stage completion.
- `markXxxStored` bulk methods accept an `asOfTimestamp` argument; the
  sweep passes the time it fetched the batch so the guard is correct
  across the full ship-then-mark round trip.
- `getUnstoredXxx` queries become `{ pendingStage: true }` sorted by
  `_id` — uses the new partial index, examines only pending docs.

Local verification on a 700,100-doc test collection: old query ~549 ms
examining 700,100 docs; new query 0 ms examining 100 docs. Index storage
~20 KB.
