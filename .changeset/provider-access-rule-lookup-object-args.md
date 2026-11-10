---
"@prosopo/provider": patch
---

`getPrioritisedAccessRule`, `getPrioritisedAccessPolicies` and the interactive record resync now take one object. The access rule lookup options (`blockOnly`, `includeDeferred`, `requestMemoHost`, `skipCache`) sit beside the storage, scope, client id and headers instead of in a trailing optional argument.
