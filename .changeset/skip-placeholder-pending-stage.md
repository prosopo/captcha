---
"@prosopo/database": patch
"@prosopo/provider": patch
---

fix(database/provider): don't flag image-captcha placeholder records as `pendingStage`

#2596 set `pendingStage: true` on every commitment write, including
`storePendingImageCommitment` which inserts placeholder records with
`id: ""` while waiting for the user to submit a solution. The sweep
then picked those up via `pendingStage_partial` (fast) and called
`markDappUserCommitmentsStored(["", "", ...], ts)` (slow) — Mongo
dedupes the `$in` array to a single empty-string bound and the
`IXSCAN { id: -1 }` walks every empty-id document on the node (~102K
on production). On pronode11 that meant 2–8 s per sweep cycle of
unnecessary index scan on `usercommitments`, replacing the old
WT-cache-thrash with a different one.

Two-part fix:

- `storePendingImageCommitment` no longer sets `pendingStage`. The
  real commitment record only gets the flag once `approve` /
  `disapprove` runs, at which point `id` is populated and staging is
  meaningful.
- `storeCommitmentsExternal` defensively skips any batch entry whose
  `id` is empty before calling `markDappUserCommitmentsStored`, so a
  stray placeholder slipping into the partial index can never
  re-introduce the bug.

For nodes already running #2596, the existing flagged placeholders
need clearing once (otherwise they sit at `pendingStage: true`
forever, since `markDappUserCommitmentsStored`'s
`lastUpdatedTimestamp <= ts` guard never matches them after their
last update). One-shot per node:

```js
db.usercommitments.updateMany(
  { pendingStage: true, id: "" },
  { $unset: { pendingStage: 1 } }
);
```
