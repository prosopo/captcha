---
"@prosopo/types": patch
---

Add the first part of a Rust port of the shared types, for the upcoming Rust provider service: `CaptchaType` and the procaptcha token codec (`encodeProcaptchaOutput` / `decodeProcaptchaOutput`). Tokens encode to the same bytes and decode the same way as in the TypeScript, including old v1 tokens. The TypeScript package is unchanged.
