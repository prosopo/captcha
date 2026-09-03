---
"@prosopo/procaptcha-frictionless": patch
---

Let every widget on a page share one detector-bundle assignment instead of only the first.

`takePrefetchedDetector` removed the in-flight entry on claim, so on a page carrying several widgets the first claimed the prefetch and every other widget issued its own provider resolve plus `assignDetectorBundle`. One production integration mounts a widget per form — eight on a property page — so a single page view cost eight assign calls rather than one, enough on its own to push ordinary visitors past a per-IP rate detector.

Sharing is sound: `detectorSessionId` binds to a `bundleId` in Redis purely so the provider can resolve which cipher keys decrypt that widget's SIMD readings. Widgets sharing an assignment run the same bundle, so those are the right keys — it is a lookup, not a one-shot token.

The guarantee the removal existed for is kept by two narrower mechanisms: a prefetch that rejects drops itself from the map, so no later widget inherits a failed pin, and entries go stale after 60s so a widget mounting much later re-resolves rather than reusing an aged provider pin. Retries were never affected either way — `customDetectBot` only claims on a first attempt.
