---
---

Fix the release build. `build:tsc` now also waits for the package's own `build:types`, so packages that import themselves by name (`@prosopo/types`, and tests in `provider` and `api-route`) can resolve. The v3.9.3 release failed at "Build packages" because of this.
