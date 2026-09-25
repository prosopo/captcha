---
---

Unit tests for the `@prosopo/server` Web Bot Auth (`authenticated`) verify path: it must call only `submitAuthenticatedCaptchaVerify`, pass the caller ip/email/session through, and apply the PoW freshness window. Tests only; no release.
