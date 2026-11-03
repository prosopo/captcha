---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
---

A puzzle served after a failed one now judges the device on what the failed solve showed.

A failed solve consumes its session, so the next puzzle was issued on a new session that knew nothing of the solve. A phone with no other device signal behind it was then given the pointer-sized puzzle again on every retry. The solve's device readings are now left on the session it consumed, and when a new puzzle has no corroborated device verdict of its own it uses the latest solve by the same user on the same site and IP from the last ten minutes.

`IProviderDatabase` gains `getRecentSolveDevice(userSitekeyIpHash, since)`.
