---
"@prosopo/user-access-policy": minor
"@prosopo/provider": minor
---

Add an arbitrary-header match dimension to user access policies.

A `Block` or `Restrict` rule can now target a named request header with an `equals`, `contains`, `notEquals`, `notContains`, `notEqualsAny` or `notContainsAny` operator. The negated operators back the portal's allow-list mode — block unless the header matches; the `*Any` pair carries a list of accepted values in `headerValue` so an allow-list over several values of the same header fires only when the header matches none of them (separate single-value rules would each fire on the other's value and block everything). Because substring `contains` and per-rule operators can't be expressed as a Redis TAG query — and an allow-list rule must still fire on a request that omits the header — the header condition is carried on the rule as `headerName`/`headerValue`/`headerOperator` and evaluated in code against the raw request headers, while an indexed `headerMatch` sentinel makes every header rule a matching candidate for every request. Header conditions are checked at both the request-time block middleware and the verify-path hard-block check, and contribute one point to rule specificity ranking (mirroring the other scalar dimensions).
