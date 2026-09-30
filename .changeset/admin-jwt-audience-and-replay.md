---
"@prosopo/util-crypto": minor
"@prosopo/keyring": minor
"@prosopo/types": minor
"@prosopo/api-express-router": minor
"@prosopo/provider": minor
---

Admin tokens can now be bound to one provider and used only once. `jwtVerify` takes optional checks for the `aud` claim and for the longest allowed lifetime, and the provider's admin check uses them. A token that names an audience must name this provider: its host, `https://` plus its host, or one of the values in `PROSOPO_ADMIN_JWT_AUDIENCE`. A token that carries a `jti` is accepted once per provider process. Tokens may live at most one hour (`PROSOPO_ADMIN_JWT_MAX_LIFETIME_SECONDS`).

Migration: tokens without `aud` or `jti` are still accepted, so current callers keep working. Callers should add both, for example `pair.jwtIssue({ expiresIn }, { aud: provider.url, jti: randomUUID() })`, minting one token per provider and per request. Callers that reuse one token for several requests to the same provider must mint a new one per request before they add `jti`. Once every caller sends `aud`, set `PROSOPO_ADMIN_JWT_REQUIRE_AUDIENCE=true` to refuse tokens without it.
