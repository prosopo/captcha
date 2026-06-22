---
"@prosopo/provider": minor
"@prosopo/database": minor
---

feat(provider): detector bundle pool foundations + empty-pool PoW fallback

Adds the provider-side building blocks for serving precomputed, per-session detector bundles (the "bumblebee-style" pool):

- `DetectorBundlePool`: loads precomputed `{id}.js`/`{id}.json` bundle pairs from disk into memory, with uniform-random per-session selection and a hot-swap `replace()` for an admin push channel.
- Redis short-TTL session→bundle mapping (`cache:detector:{id}`, default 60s) via `cacheDetectorBundle`/`getDetectorBundle`.
- Frictionless fallback: when the bundle pool is initialised but empty (no bundle can be assigned), serve a real PoW challenge instead of failing. No-op until the pool is initialised at boot, so existing detection is unaffected.
