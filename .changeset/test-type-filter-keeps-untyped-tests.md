---
"@prosopo/config": patch
---

Setting `TEST_TYPE` no longer drops test files that don't declare a type. The vitest configs selected only `*.<type>.test.ts`, so a package whose `test` script filtered by type (provider, user-access-policy, redis-client) silently skipped every plain `*.test.ts`, contrary to the config's own comment. Filtering now works by excluding the other known types (`unit`, `integration`), so untyped tests run under every filter. Two provider test files that had never run in CI since they were added are now collected.
