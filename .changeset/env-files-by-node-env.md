---
---

CI workflows get their env files from one script, `.github/scripts/setup-env-files.mjs`, keyed on NODE_ENV, instead of copying them inline. client-example-server now uses its own env.test in test jobs instead of env.development.
