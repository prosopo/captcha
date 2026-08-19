---
"@prosopo/types-database": patch
---

perf(types-database): add `{dappAccount, requestedAtTimestamp}` compound index to `UserCommitmentRecordSchema`

The anomaly-detector top-level pipeline runs the same `{dappAccount: {$in: [...]}, requestedAtTimestamp: {$gte, $lt}}` match plus `{$sort: {requestedAtTimestamp: -1}}` against all three captcha collections. Pow and puzzle already carry the matching compound index; usercommitments only had `{requestedAtTimestamp: -1}` and `{dappAccount: 1}` separately, so mongo range-scanned by timestamp and FETCH-filtered every doc by dappAccount.

Measured on the live detector query for a 1h Pimeyes window: `nReturned: 9149`, `totalDocsExamined: 24930` — 2.7× wasted docs. Scales linearly with window length and inversely with tenant share, so a small-share account on a 24h window would fetch millions of unrelated docs.

Adding the compound brings image detector queries to parity with pow/puzzle. Mongo builds the index in the background so no downtime; on a hot 1M+ doc collection expect the index to be online within minutes to hours depending on size.
