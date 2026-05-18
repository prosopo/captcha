---
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Add the ipinfo flags the provider's traffic filter actually blocks on as optional top-level fields on `StoredCaptcha`, alongside the existing `vpn` / `countryCode` fields. The job runner's CHECK_IP_INFO enrichment in captcha-private writes them from one ipinfo lookup per record.

- Booleans: `tor`, `proxy`, `datacenter`, `abuser`.
- Numerics: `abuserScore` (max of the asn + company scores — the exact value `checkTrafficFilter.ts` compares against the abuser threshold), `asnNumber`.

Applied to:
- `StoredCaptcha` interface (used by PoW + UserCommitment + Puzzle records).
- `PoWCaptchaStoredSchema` zod validator.
- PoW, Puzzle, UserCommitment mongoose schemas in `@prosopo/types-database`.

No new mongoose indexes — `vpn` is also unindexed at the provider schema level. Portal-side `database-private` models can add indexes when their search / filter UIs grow to use these signals. Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
