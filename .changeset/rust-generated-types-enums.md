---
"@prosopo/types": patch
---

The wire enums, `ApiParams`, `INPUT_LIMITS` and the timeouts in `@prosopo/types` are now generated from the Rust types, which are their source of truth, into `src/generated/wire.ts`. Every export keeps its name, values and import path, and its doc comment.
