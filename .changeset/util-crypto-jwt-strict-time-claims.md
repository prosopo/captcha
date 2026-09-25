---
"@prosopo/util-crypto": patch
---

`jwtVerify` is now strict about the time claims in a token. `nbf` (not before) must be a number if it is present; before, a string, `true`, `null` or an object was silently ignored, so a token could skip its not-before check. `exp`, `iat` and `nbf` must also be finite, so an `exp` of `1e400` (which JSON reads as Infinity) no longer makes a token that never expires. A payload that is not a JSON object, or a `sub` that is not a string, now returns an invalid result instead of throwing. Tokens issued by `jwtIssue` are unaffected.
