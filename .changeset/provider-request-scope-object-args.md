---
"@prosopo/provider": patch
---

`getRequestUserScope` and `BlacklistRequestInspector.shouldAbortRequest` now take one named-argument object instead of 9–10 positional arguments. Callers no longer pass `undefined` placeholders to reach later values. Request handling is unchanged.
