---
"@prosopo/util-crypto": patch
---

`sr25519jwtIssue` now writes the standard claims (`sub`, `iat`, `nbf`, `exp`) after any extra message fields, so a message can no longer replace them. Before, a message carrying `exp` or `nbf` could extend a token's lifetime or switch off its not-before check.
