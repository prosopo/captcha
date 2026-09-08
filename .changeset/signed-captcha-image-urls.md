---
"@prosopo/provider": patch
---

feat(provider): sign captcha image URLs with short-lived tokens

Captcha image URLs are permanent, unauthenticated and cacheable. Harvest the
URLs once and the entire image pool can be refetched indefinitely, offline and
unattributably — which is what makes scraping the demo dataset cheap, and why
regenerating the dataset alone never fixes it.

`AssetsResolver` has been declared in `@prosopo/types` and called by
`parseCaptchaAssets` since the image flow was written, but nothing ever assigned
it. `env.assetsResolver` was always `undefined`, so `item.data` went out exactly
as stored. This fills that hook with a bunny.net token-authentication signer.

Signing happens strictly below `item.data`. The item hash stays
`blake2b(image bytes)`, so `captchaId`, `captchaContentId` and `datasetId` are
untouched and no dataset has to be rebuilt to adopt this — a signed URL is never
itself hashed. The resolver is constructed per request rather than per process,
so each challenge's URLs expire on their own clock and can optionally be bound
to the requesting IP via `ZoneSecurityIncludeHashRemoteIP`.

The scheme was checked against a live token-auth pull zone before being written:
a correctly signed URL returns 200, while a tampered token, an expired token,
and a token replayed against a different path all return 403. The token is bound
to its exact path, so one harvested URL cannot be rewritten across the pool.

Inactive unless `PROSOPO_ASSET_TOKEN_KEY` is set. Without it the resolver is
`undefined` and the response is byte-for-byte what it is today, so this can ship
ahead of the infrastructure change.

Ordering matters when it is switched on. The pull zone only excludes
`token`/`expires` from its cache key while token authentication is enabled: with
it on, repeated requests carrying different tokens still hit cache; with it off,
every distinct `expires` becomes its own cache entry and every image misses.
Enabling the zone first is worse still — unsigned requests 403 and image
captchas break — so the zone has to be switched over promptly after providers
begin signing, not before.
