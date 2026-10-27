---
"@prosopo/types": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/provider": patch
---

The widget now tells the provider which bundle it is and where it was loaded from, on every request:

- `X-Prosopo-Bundle-Version`: the release the bundle was built from, or `dev` for a local build.
- `X-Prosopo-Bundle-Origin`: the origin the widget's code came from. `https://js.prosopo.io` is the hosted bundle. Anything else is a site serving its own copy, or building our npm packages into its app.

Providers store request headers on the session and in the request logs, so together with the site key these show which sites self-host and which version each one runs.

The provider now allows both headers in CORS. Every provider must run this version before the new bundle is published to the CDN: a widget sending these headers to an older provider fails the browser's preflight check and cannot load a captcha.
