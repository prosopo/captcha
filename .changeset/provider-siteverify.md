---
"@prosopo/provider": minor
"@prosopo/captcha": patch
---

Self-hosted providers can answer `POST /siteverify` with the same `{token, secret}` contract as the hosted siteverify API, so a site can verify tokens against its own provider without `@prosopo/server`. The secret is the site key's private key and must belong to the token's site key. The endpoint is off unless `PROSOPO_SITEVERIFY_ENABLED=1`, which the self-hosted compose file sets.
