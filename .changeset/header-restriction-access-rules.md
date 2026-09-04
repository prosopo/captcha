---
"@prosopo/user-access-policy": minor
"@prosopo/provider": minor
---

Add an arbitrary-header match dimension to user access policies.

A `Block` or `Restrict` rule can now target a named request header with an `equals`, `contains`, `notEquals`, `notContains`, `notEqualsAny` or `notContainsAny` operator. The negated operators back the portal's allow-list mode — block unless the header matches; the `*Any` pair carries a list of accepted values in `headerValue` so an allow-list over several values of the same header fires only when the header matches none of them (separate single-value rules would each fire on the other's value and block everything). Because substring `contains` and per-rule operators can't be expressed as a Redis TAG query — and an allow-list rule must still fire on a request that omits the header — the header condition is carried on the rule as `headerName`/`headerValue`/`headerOperator` and evaluated in code against the raw request headers, while an indexed `headerMatch` sentinel makes every header rule a matching candidate for every request. Header rules contribute one point to rule specificity ranking, mirroring the other scalar dimensions.

The raw request headers are a **required** argument of `getPrioritisedAccessRule` / `CaptchaManager.getPrioritisedAccessPolicies`, with no default. A negated header operator treats a missing header as "does not match", so a lookup that quietly ran with an empty header map would fire every allow-list rule on every request. Every lookup now passes them: the request-time block middleware, the verify-path hard-block check, the `/frictionless` policy and dedup lookups, and the image / PoW / puzzle challenge endpoints.

`getPrioritisedAccessRule` now caches only the candidate fetch and ranks per request, because the header verdict depends on data that is not part of the cache key. This also closes a latent gap where `os` was never part of `hardBlockCacheKey`, so a cached ranked list could serve one operating system's verdict to a request from another.
