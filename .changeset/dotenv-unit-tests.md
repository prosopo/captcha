---
"@prosopo/dotenv": patch
---

test(dotenv): add unit test suite covering env discovery and loading

Adds 47 unit tests for `getEnv`, `getEnvFile` and `loadEnv`, reaching 100%
statement, branch, function and line coverage, and wires the package into
`turbo run test` so it runs in CI.

Also fixes `getEnvFile` so that a `NODE_ENV` sanitising to the empty string
(e.g. `"!!!"`) falls back to the unsuffixed `.env` rather than searching for
the never-created `.env.` filename.
