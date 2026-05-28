---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

feat: optional `storeMetadata` site setting persists `/verify` email

Adds a per-site-key boolean `storeMetadata` (default `false`) to
`ClientSettingsSchema` / `UserSettingsSchema`. When enabled, the provider
writes the `email` that dapp servers forward on the image, PoW and puzzle
`/verify` endpoints onto the corresponding captcha record as a new
`providedEmail` field, mirroring how `providedIp` is already stored.

Off by default. Existing spam-email checks still inspect `email`
unconditionally — this setting only gates **storage** of the email so it can
be sampled later to judge whether traffic is mostly spam.
