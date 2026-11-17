---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/util": patch
"@prosopo/util-crypto": patch
"@prosopo/native-ja4": patch
"@prosopo/native-merkle": patch
"@prosopo/native-puzzle": patch
---

Fail closed on bad numbers and future timestamps.

- The frictionless decision machine now blocks a session whose bot score, bot threshold or image threshold is NaN or infinite, with the new `FrictionlessReason.INVALID_SCORE`. Before, every comparison with NaN came out false, so such a session fell through to the frictionless PoW pass.
- A decoded detector score is clamped to 0–1, and an infinite one is treated like a missing one (score 1).
- `FrictionlessManager.timestampTooOld` treats a NaN timestamp, or one more than 30 seconds in the future, as stale. Before, a future timestamp never aged out. `timestampDecayFunction` gives those timestamps the longest image challenge instead of the shortest.
- `verifyRecency` rejects challenge timestamps more than 30 seconds in the future.
- `jwtVerify` rejects a token whose `iat` is more than 30 seconds in the future. Such a token passed the `maxLifetimeSeconds` check yet stayed valid until its far-off `exp`.
- The native Rust packages enable `overflow-checks` in release builds, so integer overflow panics rather than wrapping silently.
