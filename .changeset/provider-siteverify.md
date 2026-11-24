---
"@prosopo/provider": minor
"@prosopo/captcha": patch
---

Self-hosted providers can answer `POST /siteverify` with the same `{token, secret}` request and response as the hosted siteverify API, so a site can verify tokens against its own provider without `@prosopo/server`. The secret is the site key's private key and must belong to the token's site key. Like the hosted endpoint, it answers an unreadable token as not verified, accepts the legacy `//1` secret, honours the reserved test site keys and answers verified if verification takes longer than 5 seconds. It is rate-limited and off unless `PROSOPO_SITEVERIFY_ENABLED=1`, which the self-hosted compose file sets. Supersedes #3648.
