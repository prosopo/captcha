---
"@prosopo/account": patch
"@prosopo/api": patch
"@prosopo/api-express-router": patch
"@prosopo/api-route": patch
"@prosopo/audio-assets": patch
"@prosopo/captcha-severity": patch
"@prosopo/cli": patch
"@prosopo/client-bundle-example": patch
"@prosopo/client-example-server": patch
"@prosopo/common": patch
"@prosopo/config": patch
"@prosopo/cypress-shared": patch
"@prosopo/database": patch
"@prosopo/datasets": patch
"@prosopo/datasets-fs": patch
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
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-common": patch
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
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/types-env": patch
"@prosopo/user-access-policy": patch
"@prosopo/util": patch
"@prosopo/util-crypto": patch
"@prosopo/web-bot-auth": patch
"@prosopo/widget-skeleton": patch
"@prosopo/workspace": patch
---

Roll up the open Dependabot updates: express 5 (with `@types/express` 5), dotenv 18, undici 8, geolib 4, vitest 5, vite 8.1.6 everywhere, 17 minor and patch bumps (Babel, mongoose, i18next, ip-address, turbo and others), `@angular/router` in the Angular demo, and a GitHub Actions bump.

The whole vitest family moves to 5.0.4, including `@vitest/coverage-v8`, because `@vitest/browser-playwright` 5 only works with vitest 5. The `@types/express-serve-static-core` override moves to 5.1.3 to match `@types/express` 5.

`@prosopo/dotenv` now loads env files with `quiet: true`. Since dotenv 17, every load prints an "injected env" line to stderr unless told not to.
