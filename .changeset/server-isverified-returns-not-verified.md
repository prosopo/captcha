---
"@prosopo/server": minor
---

`ProsopoServer.isVerified` now resolves `{ verified: false }` when verification cannot be completed — a malformed token, an unreachable provider list or provider, or a signing failure — instead of throwing `API.BAD_REQUEST`. The outcome is still fail-closed, but site owners who did not wrap the call in `try`/`catch` no longer return a 500 from their own endpoint. The underlying error is still logged.
