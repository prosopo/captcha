---
"@prosopo/provider": patch
"@prosopo/database": patch
---

Derive the detector bundle for a caller instead of storing it.

`assignDetectorBundle` now picks the bundle with a keyed hash of the caller's
address, using a per-provider secret kept on the pool volume. Same caller, same
bundle, with nothing recorded and nothing to expire — which also means the
result no longer changes when the cache is unavailable.

Replaces the Redis client → bundle entry added in the previous patch, so
`bindDetectorBundleToClient` and its TTL constant are gone.
