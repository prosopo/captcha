---
"@prosopo/cli": patch
"@prosopo/provider-mock": patch
"@prosopo/client-example-server": patch
---

Pin Node to 24.22.1 in every Docker image and CI workflow, the first 24.x release with the fix for CVE-2026-111497 (an out-of-bounds write in the bundled Brotli decoder that can lead to remote code execution).

Before this, everything asked for plain `24`, which does not guarantee a patched build. Docker reuses a cached base image, and `setup-node` uses whatever 24.x a runner already has cached.

The provider image needed more than a tag bump. Its runtime, `gcr.io/distroless/nodejs24-debian12`, is stuck on Node 24.14.0 and will not get the fix. It now runs on `nodejs24-debian13`, pinned by digest because distroless publishes no Node version tags. The builder moves to `node:24.22.1-trixie-slim` so both stages still use the same Debian release and glibc. Sharp and the native ja4, merkle and puzzle addons were checked loading on the new runtime.
