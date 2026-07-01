---
"@prosopo/provider": minor
"@prosopo/database": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/api": minor
"@prosopo/procaptcha-frictionless": minor
---

feat(detector): serve the detector only from per-session provider bundles; PoW fallback

The detector now lives ONLY in the provider-served, precomputed pool bundles — there is no detector bundled into the widget and no legacy detector-key pool. Each session's bundle encrypts everything it produces (bot score, SIMD readings, behavioural data) with its own RSA keypair + inner ChaCha20-Poly1305 cipher; the provider decrypts each payload with that exact bundle, resolved per session.

- `DetectorBundlePool`: loads precomputed `{id}.js`/`{id}.json` bundle pairs from disk, uniform-random per-session selection, hot-swap `replace()` for the admin push channel.
- The pool is ALWAYS initialised at boot (a missing/empty dir yields an empty pool), collapsing the old three states into two: bundles present ⇒ per-session serving; no bundles ⇒ always PoW.
- Redis short-TTL `detectorSessionId → bundleId` binding; the resolved `bundleId` is promoted onto the durable session record so later hops (SIMD attach, PoW/puzzle/image solution submit) decrypt with the same bundle.
- Client: removed the inlined `@prosopo/detector` runtime import (now type-only). When no provider bundle can be obtained/run, the client signals `detectorUnavailable` and the provider serves a PoW challenge.
- All server decrypt paths (score, SIMD readings, behavioural data) resolve the session's bundle and pass its inner cipher; the legacy key-pool brute force and its env fallback are removed from the detection paths. Decrypt failures fail closed (treated as bot ⇒ PoW).
