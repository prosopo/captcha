---
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/types-database": patch
---

Stop puzzle, icon-order and audio records in the central DB getting stuck at Pending after they were graded. A provider streams the record to the central DB after every write without waiting for the last one to land. If a copy taken before the result was written landed last, it replaced the graded copy. About 2.7% of icon-order submissions on 5–9 Nov ended up like this. The provider's own record and the session were always right, so users and siteverify were not affected. Only the portal and reports read the stale copy.

- The central write now only applies a copy that is at least as new as the stored one.
- The provider now reads `lastUpdatedTimestamp` back when it streams an update and bumps it on every update. Updates now clear `pendingStage` once they land. Before, every interactive record kept it.
- The batch sweep now also resends interactive records that are still pending, as it already does for image, PoW and sessions. It only looks at records from the last 48 hours, so it doesn't resend the backlog older releases left flagged.
