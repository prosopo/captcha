---
"@prosopo/provider": patch
---

Fix regression from previous release where a bundleId mismatch on a
deduped session was resolved by evicting the session. If the widget
already had a `/captcha/{type}` or solution call in flight for that
sessionId, the session lookup mid-request returned `No session found`,
the handler returned `INCORRECT_CAPTCHA_TYPE` (400), and the client
saw a broken challenge. Observed at ~21% of pimeyes `/captcha/pow`
post-hotfix (baseline 0.3%).

Rebind the reused session's `bundleId` in place with cache-first
write-behind semantics instead. Only the `bundleId` field is updated
— `captchaType`, score, threshold and every other field stay put, so
in-flight `/captcha/{type}` calls keep working with the same sessionId
and future SIMD / behavioural decrypts use the fresh key.
