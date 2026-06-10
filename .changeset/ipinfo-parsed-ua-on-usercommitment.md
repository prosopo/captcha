---
"@prosopo/types": patch
---

Add `ipInfo` and `parsedUserAgentInfo` to the Zod `UserCommitmentSchema` so the provider stops silently stripping them on the write path. Mirrors the existing fields on `PoWCaptchaStoredSchema` and `SessionSchema`.
