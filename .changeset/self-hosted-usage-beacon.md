---
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-bundle": minor
"@prosopo/config": patch
"@prosopo/scripts": patch
---

A self-hosted widget (one built with `PROSOPO_PROVIDER_LIST`) now sends Prosopo a usage beacon on about one render in a thousand: a single `GET https://beacon.prosopo.io/v1/b.gif` carrying the page hostname, site key, bundle version and sample rate, with no referrer, cookies or visitor data. It lets us count self-hosted installs and the versions they run, so we can tell self-hosters about new releases and critical fixes. Hosted widgets never send it.

Build the bundle with `PROSOPO_USAGE_BEACON=false` to turn it off. The generated self-hosted `.env` now includes the setting, and `SELF_HOSTING.md` documents exactly what is sent.
