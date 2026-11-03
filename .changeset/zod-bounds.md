---
"@prosopo/types": minor
"@prosopo/provider": patch
"@prosopo/user-access-policy": patch
"@prosopo/datasets-fs": patch
"@prosopo/cli": patch
---

Unbounded zod strings, arrays and numbers now have maximum sizes, using `INPUT_LIMITS`. Oversized values fail validation.
