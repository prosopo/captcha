---
---

Test-only change: pre-download the mongod binary in a vitest globalSetup to avoid
the mongodb-memory-server lockfile download race in `@prosopo/database` tests. No
published code changes, so no release is required.
