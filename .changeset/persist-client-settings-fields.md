---
"@prosopo/types-database": patch
---

`allowAgents`, `assetOrigin` and `clientUrl` are now declared on the stored
client settings schema. Mongoose is strict by default, so these three were
accepted by the API and then dropped on write, leaving the provider to read
`undefined` for settings that had been registered successfully.
