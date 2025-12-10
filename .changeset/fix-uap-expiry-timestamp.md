---
"@prosopo/user-access-policy": patch
---

Fix UAP expiry timestamp handling: missing propagation and unit conversion. Timestamps are now correctly propagated when policyScopes are present, and milliseconds are properly converted to seconds for Redis expireAt.
