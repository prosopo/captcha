---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Serve the frictionless captcha route from the Rust provider: it decides which captcha a widget gets from its detector payload, the site's settings, access rules, the traffic filter and the score thresholds, and stores and caches the session as the TypeScript does. A test replays requests recorded from the TypeScript server and checks the answers, stored sessions and cache match. The TypeScript is unchanged.
