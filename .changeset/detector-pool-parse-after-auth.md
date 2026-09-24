---
"@prosopo/provider": patch
---

The provider now only accepts a detector-pool upload of up to 128 MB from a caller with a valid admin token. Before, the large upload limit applied to anyone who sent a request to that path, because the body was read and parsed before the admin check and the rate limits ran, so unauthenticated requests could make the provider buffer and parse up to 128 MB each. Other requests to that path now get the normal 1 MB limit and are then refused by the admin check.
