---
"@prosopo/dotenv": patch
---

test(dotenv): add vitest type tests for the env API

Runtime tests cannot catch a published signature that silently widens. These
pin the parts consumers depend on: `getEnv` and `getEnvFile` returning a plain
`string` rather than `string | undefined` (both already default the absent
case away, so a nullable return would push work back onto every caller),
`loadEnv` returning the resolved path rather than void, and the optional
positional arguments of `loadEnv`/`getEnvFile` in order.
