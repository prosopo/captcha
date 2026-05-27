---
"@prosopo/util": patch
"@prosopo/provider": patch
---

feat(provider): allow Google Translate proxy domains through the domain check middleware

Google Translate proxies a site under `<encoded>.translate.goog` (e.g.
`prosopo-io.translate.goog`), encoding `.` as `-` and `-` as `--`. With the
previous implementation the proxied host never matched a site's allowed
domains and the captcha widget broke on translated pages.

Add `decodeGoogleTranslateHost` to `@prosopo/util` which reverses the
encoding, and update the provider's `domainMiddleware` so that when the
request origin is a `*.translate.goog` URL it also tries the decoded
origin against the site's allowed domains.

Closes #2585.
