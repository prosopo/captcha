---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/locale": patch
---

Adds a per-email submission-count rate limit on the verify pipeline. Site operators can now cap how many server-checked captcha submissions any one normalised email (Gmail dot / `+tag` tricks collapsed across providers) may back before further submissions from that address are rejected with `API.SPAM_EMAIL_COUNT_EXCEEDED`.

- New `spamFilter.emailRules.maxEmailSubmissionCount` (int, min 1, optional) on `ClientSettingsSchema`.
- New `metadata.emailNormalised` field on all three captcha records (image / PoW / puzzle) — written alongside `metadata.email` whenever `storeMetadata` is on. Backed by a partial index (`spamEmailCount_partial`) on each collection.
- New DB method `countCommitmentsByNormalisedEmail(dappAccount, emailNormalised)` sums the three per-collection counts so limits span captcha types.
- Puzzle verify gains a `spamFilter` parameter to bring it to parity with img/pow for the count check.
- English + all 31 non-English locales gain the `API.SPAM_EMAIL_COUNT_EXCEEDED` translation.
- Fixes silent-drift bug: `UserSettingsSchema.spamFilter.emailRules` was missing `maxEmailSubmissionCount` on the mongoose side, which strict mode would have dropped on `$set`.
