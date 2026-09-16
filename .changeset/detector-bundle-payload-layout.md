---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Carry each detector bundle's `payloadLayout` from its pool entry through to the decoder.

Pool bundles now ship an extra opaque per-bundle value alongside the private key and inner config, and the decoder needs it to read what that bundle's detector produced. The pool loader reads it from `{id}.json`, the persist and admin-push paths keep it, and the frictionless decrypt passes it to `decodePayload` along with the key.

Bundles without one — pools built before this — behave exactly as before, so a provider can be updated ahead of its pool.

Covered by pool tests that the value survives load, persist and reload, and by the existing decrypt tests.
