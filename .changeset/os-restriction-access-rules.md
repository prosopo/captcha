---
"@prosopo/user-access-policy": minor
"@prosopo/provider": minor
---

Add an `os` (operating system) match dimension to user access policies.

The provider now classifies each request's operating system server-side from the User-Agent (`classifyOs`, returning one of `windows`/`macos`/`ios`/`android`/`linux`/`unknown`) and threads it into the user scope used to match access rules, so a `Block` or `Restrict` rule can target a specific OS. The OS is always populated (falling back to `unknown`) and derived from the full User-Agent rather than the easily-omitted `sec-ch-ua-platform` client hint, so it cannot be bypassed by dropping client hints. `os` is stored and indexed in Redis as a TAG (mirroring `countryCode`) and contributes one point to rule specificity ranking.
