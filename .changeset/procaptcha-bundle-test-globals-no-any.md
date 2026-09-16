---
"@prosopo/procaptcha-bundle": patch
---

Tests now clear the fake `document` and `window` globals without switching off type checking, so the last `any` suppressions in the bundle's tests are gone. No change to the published code.
