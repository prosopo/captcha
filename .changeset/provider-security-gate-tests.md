---
---

Unit tests for two provider security gates with no unit coverage: `domainMiddleware` (site key to allowed-origin binding, including lookalike domains, Google Translate proxies, missing Origin and fail-closed errors) and `FrictionlessManager.verifyAuthenticatedSession` (IP binding, replay, captcha-type and client-session checks). Tests only; no release.
