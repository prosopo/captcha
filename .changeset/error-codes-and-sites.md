---
"@prosopo/common": minor
"@prosopo/locale": minor
"@prosopo/types": minor
"@prosopo/api-express-router": minor
"@prosopo/client-example-server": patch
"@prosopo/provider-mock": patch
"@prosopo/scripts": patch
"@prosopo/account": patch
"@prosopo/api": patch
"@prosopo/cli": patch
"@prosopo/database": patch
"@prosopo/datasets": patch
"@prosopo/datasets-fs": patch
"@prosopo/env": patch
"@prosopo/keyring": patch
"@prosopo/load-balancer": patch
"@prosopo/logger": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
"@prosopo/provider": patch
"@prosopo/server": patch
"@prosopo/util": patch
---

Errors now carry a fixed code and a site instead of a translation key.

Every error is a `ProsopoError` with a `code` from one list in
`@prosopo/common` (`ERROR_CODES`) and an `errorSite` such as `PROV-12`, which
names the one place it was thrown. Together they make the `errorId`, e.g.
`SITE_KEY_INVALID:PROV-31`, which the widget shows after the message so a
screenshot is enough to find the throw.

What a client sees:

- A public error (bad site key, blocked network, and so on) sends its code,
  English message, data and errorId.
- Anything else sends only `BACKEND_ERROR:<site>` (or `FRONTEND_ERROR:<site>`
  from the widget) and a status. Internal details never leave the server.

The provider no longer translates errors. The widget looks up
`ERRORS.<CODE>` in its catalogue and falls back to the English message. The
old error classes (`ProsopoApiError`, `ProsopoEnvError` and the rest), the
`key`/`messageEn` fields and `localiseErrorMessage` are gone.

Other changes in behaviour:

- An error with no specific code is a hidden 500.
- Errors no longer log themselves when they are created. The server logs each
  unhandled one once: 5xx as errors, 4xx at debug.
- An invalid PoW signature is a 401 instead of a 500.
- `stringifyBigInts` returns a copy instead of changing its input, so frozen
  error context can be logged.
- The provider's last hand-written error replies now use the same error body.
  These were the missing-header 401s, the access-policy block, autoBan, the
  metrics 401/403 and the rate limiter. The rate limiter answers with a new
  public `RATE_LIMITED` (429) code.
