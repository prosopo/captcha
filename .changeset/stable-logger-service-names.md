---
"@prosopo/provider": patch
"@prosopo/client-example-server": patch
"@prosopo/provider-mock": patch
---

Replace `import.meta.url`-derived logger scopes with stable, kebab-case service
names (e.g. `provider:admin:dns-event`, `client-example-server:app`) so
`PROSOPO_LOG_LEVEL` directive matching is deterministic across builds.
