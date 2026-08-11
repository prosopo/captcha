---
"@prosopo/provider": patch
---

blacklistRequestInspector: write `token: "blocked"` instead of `""` on blocked
sessions so the mongoose `required: true` validator on `Session.token` stops
rejecting the write. The empty-string sentinel was surfacing as
"Validation failed: token: Path `token` is required" spam on every access-policy
block and inflating API.PARSE_ERROR volume by ~3× on days with elevated block
rules.
