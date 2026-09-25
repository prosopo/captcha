---
"@prosopo/web-bot-auth": patch
"@prosopo/util": patch
"@prosopo/procaptcha-bundle": patch
---

Add fast-check property tests for the input parsers in web-bot-auth, util, util-crypto, types, user-access-policy, provider and procaptcha-bundle, and fix the three bugs they found:

- web-bot-auth: a `Signature-Agent` header holding an invalid URL (e.g. `"https://a b"`) made `verifyWebBotAuth` throw instead of returning `unparseable-signature-agent`.
- util: `embedData` checked its length against the string including `0x` and ignored the two-character count prefix, so data that did not fit could overwrite the header and `extractData` returned the wrong numbers.
- procaptcha-bundle: a `#fragment` on the bundle's script URL was read as part of the `render` or `onload` value.
