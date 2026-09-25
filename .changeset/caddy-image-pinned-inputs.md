---
"@prosopo/caddy-docker": patch
---

Pin everything that goes into the `prosopo/caddy` image.

The Dockerfile built from the floating `caddy:2-builder` and `caddy:2` tags and asked xcaddy for each plugin without a version, so every rebuild took whatever those tags and branches held that day. That included the third-party `lolPants/caddy-requestid` and the untagged `prosopo/chaddy`. The base images are now pinned by tag and digest (caddy 2.11.4), caddy itself by version, and each plugin by version. The versions are the ones already inside the published `prosopo/caddy:2.5.9`, so the Go dependency list of the rebuilt binary is identical; only the Go toolchain moves from 1.26.6 to 1.26.8, taken from the pinned builder image.
