---
"@prosopo/account": patch
"@prosopo/api-express-router": patch
"@prosopo/api": patch
"@prosopo/api-route": patch
"@prosopo/audio-assets": patch
"@prosopo/captcha-severity": patch
"@prosopo/client-bundle-example": patch
"@prosopo/client-example-server": patch
"@prosopo/cli": patch
"@prosopo/common": patch
"@prosopo/config": patch
"@prosopo/cypress-shared": patch
"@prosopo/database": patch
"@prosopo/datasets": patch
"@prosopo/datasets-fs": patch
"@prosopo/detector-botd": patch
"@prosopo/detector": patch
"@prosopo/dotenv": patch
"@prosopo/env": patch
"@prosopo/fingerprint": patch
"@prosopo/icon-order-assets": patch
"@prosopo/ipinfo": patch
"@prosopo/keyring": patch
"@prosopo/lint": patch
"@prosopo/load-balancer": patch
"@prosopo/locale": patch
"@prosopo/logger": patch
"@prosopo/native-ja4": patch
"@prosopo/native-merkle": patch
"@prosopo/native-puzzle": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-integration-build-config": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-wrapper": patch
"@prosopo/prosoponator-bot": patch
"@prosopo/provider": patch
"@prosopo/provider-mock": patch
"@prosopo/puzzle-assets": patch
"@prosopo/redis-client": patch
"@prosopo/scripts": patch
"@prosopo/server": patch
"@prosopo/types-database": patch
"@prosopo/types-env": patch
"@prosopo/types": patch
"@prosopo/user-access-policy": patch
"@prosopo/util-crypto": patch
"@prosopo/util": patch
"@prosopo/web-bot-auth": patch
"@prosopo/widget-skeleton": patch
"@prosopo/workspace": patch
---

Each kind of build now writes to its own folder under dist: dist/esm (vite ESM), dist/cjs (vite CommonJS), dist/types (declarations), dist/tsc (plain tsc), dist/bundle and dist/bundle-webpack (bundles) and dist/native (the Rust addons). Turbo caches each folder separately, so building one variant no longer overwrites or invalidates another. Package exports point at the new folders; anything importing a file from dist by path has to add the variant folder.

The Rust addons are no longer committed. They are built into dist/native, in debug for development and tests and fully optimised when NODE_ENV=production, so building them now needs a Rust toolchain.

Code that found the repo root or its certificates by climbing a fixed number of folders up from its own file now starts from its package's folder instead (new `packageDir` in @prosopo/util/node). The fixed count stopped working once the build output moved one folder deeper.
