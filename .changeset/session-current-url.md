---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/util": patch
"@prosopo/api": patch
"@prosopo/provider": patch
"@prosopo/procaptcha-frictionless": patch
---

feat(provider): record the page URL a frictionless session originated from and require it

The frictionless client now reports the page it was rendered on (built from `window.location.origin + pathname`) in the challenge request, and the provider stores it on the session as `currentUrl`. The value is reduced to scheme + host + path on both the client and the provider (`sanitisePageUrl`): the query string, fragment and any embedded `user:pass@` credentials are stripped so URL-borne secrets (tokens, reset codes, session ids) are never persisted. A session whose request carries no usable page URL is treated as a bot signal and forced down the image-captcha path (`FrictionlessReason.MISSING_CURRENT_URL`).
