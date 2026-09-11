---
"@prosopo/provider": patch
---

Log why a detector bundle could not be resolved

`resolveBundleByDetectorSession` returns undefined on three unrelated
conditions: the caller sent no detector session id, the
`detectorSessionId → bundleId` Redis binding was absent or had expired, or the
binding named a bundle this provider no longer holds in its pool.

All three surface downstream as the same thing — `resolveDecryptAttempts`
hands back an empty key list, the decrypt loop never runs, and the score is
forced to 1 with `DECRYPTION_FAILED`, so the caller is challenged despite
nothing having been measured about it. They need different fixes, but nothing
recorded which one had happened: the only line carrying that detail logged at
`debug`, which is below the level aggregated log search runs at, and it could
not have separated them anyway because `resolveDecryptAttempts` omits the
`bundleId` whenever the attempt list is empty.

Adds a single `info` line, `"Detector bundle not resolved"`, carrying a `cause`
of `noDetectorSession`, `noBinding` or `bundleNotInPool`, plus the `bundleId`
in the last case. It is emitted only on the failure path, so there is no cost
on the hot path, and the pool lookup now happens after the binding check rather
than before it.

No behavioural change — the same conditions return undefined as before.
