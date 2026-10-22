---
"@prosopo/server": minor
---

`ProsopoServer.isVerified` now resolves `{ verified: false }` when verification cannot be completed — a malformed token, an unreachable provider list or provider, a provider request that times out, or a signing failure — instead of throwing. A timed-out provider request used to reject with a 504 error; it now answers "not verified" too. The outcome is still fail-closed, but site owners who did not wrap the call in `try`/`catch` no longer return a 500 from their own endpoint. The underlying error, with its 504 or 500 status, is still logged.
