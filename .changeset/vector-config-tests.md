---
"@prosopo/vector-docker": patch
---

Add `test` and `test:negative` scripts that validate vector.toml and run its unit tests inside the pinned vector image, so a broken config or an env-var change in a vector upgrade fails CI instead of silently dropping logs.
