---
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Add `tor`, `proxy`, `datacenter`, `abuser` optional booleans to `StoredCaptcha` so the job runner's CHECK_IP_INFO enrichment can persist every flag the provider's traffic filter blocks on — alongside the existing `vpn` / `countryCode` fields.

- `StoredCaptcha` interface (used by PoW + UserCommitment + Puzzle records).
- `PoWCaptchaStoredSchema` zod validator.
- PoW, Puzzle, UserCommitment mongoose schemas in `@prosopo/types-database`.

No new mongoose indexes — `vpn` is also unindexed at the provider schema level. Portal-side `database-private` models can add indexes when their search / filter UIs grow to use these signals. Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
