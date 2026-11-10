---
"@prosopo/types": minor
"@prosopo/provider": patch
"@prosopo/user-access-policy": patch
"@prosopo/datasets-fs": patch
"@prosopo/cli": patch
---

Every zod string, array and record now has a maximum size and every number must be a safe number, using the shared `INPUT_LIMITS`. Oversized values fail validation. `findZodBounds` reports any schema field without a limit, and a test runs it over every schema `@prosopo/types` exports.
