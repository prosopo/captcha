---
"@prosopo/client-bundle-example": patch
---

The explicit-render demo pages now wait for `render()` before logging, so they show the real widget id instead of `widget ID: [object Promise]`. The two frictionless explicit pages log the id as well. A test checks that every demo page waits for `render()`.
