---
"@prosopo/types": patch
"@prosopo/api-route": patch
---

Add the dataset and captcha types to the Rust port of the shared types: the captcha, solution and dataset schemas with typed outputs, the PoW and merkle record types, and the image challenge response. The Rust zod replacement gains `undefined()`. The TypeScript packages are unchanged.
