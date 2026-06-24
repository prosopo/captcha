---
"@prosopo/types": patch
"@prosopo/provider": patch
---

fix(provider): length-bound and sanitise request inputs across the provider API endpoints.

- Add shared zod helpers in `@prosopo/types` (`INPUT_LIMITS`, `boundedString`, `safeText`, `safeLine`): every request string field is now length-bounded, and human freetext additionally rejects control characters (null bytes etc.). Typing fields as strings already blocks Mongo operator injection; the control-character rejection covers the remaining log/header-injection vectors.
- Apply the helpers across the provider request schemas (image/pow/puzzle captcha challenge & solution bodies, frictionless challenge, server verify, DNS event ingestion, sitekey register/remove, detector-key and decision-machine admin bodies, and the spam-email check). Tokens, signatures, behavioural/simd readings and decision-machine source get generous caps; accounts/site-keys/hashes/ids get tight ones.

- Lower the provider API body-parser cap from 50 MB to 1 MB (`express.json` in `startProviderApi.ts`) as a coarse oversized-payload backstop before parsing.

Email and IP fields are treated as length-bounded strings (email keeps its existing format check where present).
