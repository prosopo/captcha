---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

A site can now set its own `solutionTimeout` and `verifiedTimeout` for each captcha type, under the new `captchaTimeouts` setting (keys `pow`, `image`, `puzzle`, `iconOrder`, `audio`). A type left out keeps the site-wide values, so existing sites behave as before. For image, which has no site-wide window today, the values cap the time allowed by the images themselves and by the `maxVerifiedTime` the site's server sends.
