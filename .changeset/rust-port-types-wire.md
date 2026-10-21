---
"@prosopo/types": patch
---

Add more of the Rust port of the shared types: `ApiParams`, `INPUT_LIMITS`, the request sanitisers (`boundedString`, `safeText`, `safeLine`, `boundedArray`), the stored enums (result and frictionless reasons, captcha statuses, tiers, scheduler tasks, decision machines), the timeouts, the decision-machine counter keys and `isBlockingCaptchaResult`. Their values, keys and validation match the TypeScript. The TypeScript package is unchanged.
