---
"@prosopo/config": minor
"@prosopo/procaptcha-bundle": patch
---

Name the procaptcha bundle's honeypot and shared fingerprint chunks from a seed instead of at random, so bundling the same source twice gives byte-identical output.

The names come from the new `buildToken` helper in `@prosopo/config`: an HMAC of the package version (or `PROSOPO_BUILD_SEED`) keyed by the secret `PROSOPO_BUILD_TOKEN_KEY`. They still change every release, and without the key they cannot be worked out from this public source.
