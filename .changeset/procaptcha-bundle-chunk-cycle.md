---
"@prosopo/procaptcha-bundle": patch
---

Keep util-crypto in the shared browser chunk. Split into its own chunk it
formed a Rolldown chunk cycle with the fingerprint chunk on the detector-pool
branch, where the detector is no longer bundled into the widget. Whichever
chunk evaluated first read the other's module-scope bindings before they were
assigned, so the widget threw on load ("init_dist is not a function", then
isHex reading `.test` of undefined) and never defined window.procaptcha.
