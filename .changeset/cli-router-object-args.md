---
"@prosopo/cli": patch
"@prosopo/api-express-router": patch
"@prosopo/provider": patch
---

`getConfig` (exported as `defaultConfig`), `start` and `authMiddleware` take one object argument instead of several optional positional ones. CLI flags are unchanged.
