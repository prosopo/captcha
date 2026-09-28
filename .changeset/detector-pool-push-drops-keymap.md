---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Carry the detector bundle's `keyMap` through the pool push.

`keyMap` is an opaque per-bundle decode parameter, written alongside each
bundle by the pool build and meaningless without it — the same contract as
`payloadLayout`. The admin pool-replace body schema never declared it, so zod
stripped it from every push, and the endpoint's persist step then wrote the
bundle back to disk without it.

The result was a pool the provider served but could not decode: the push
returned success with `persisted: true`, the bundles loaded and sessions were
assigned them, but what they produced could not be read. Pools copied onto the
volume were unaffected, because that path never goes through the schema.

Adds `keyMap` to `ReplaceDetectorPoolBody` and writes it in
`persistDetectorBundlePool`.
