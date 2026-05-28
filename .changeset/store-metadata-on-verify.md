---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

feat: optional `storeMetadata` site setting persists `/verify` metadata

Adds a per-site-key boolean `storeMetadata` (default `false`) to
`ClientSettingsSchema` / `UserSettingsSchema`. When enabled, the provider
writes the dapp-server-forwarded metadata that arrives on the image, PoW
and puzzle `/verify` endpoints onto the corresponding captcha record under
a new `metadata` sub-document (`{ email?: string }` today; more fields
will be added here as the verify payload grows).

`providedIp` stays top-level — existing data and indexes already use it,
and it predates this setting.

Off by default. Existing spam-email checks still inspect the submitted
email unconditionally — this setting only gates **storage** of metadata
so the submitted values can be sampled later to judge whether traffic is
mostly spam.
