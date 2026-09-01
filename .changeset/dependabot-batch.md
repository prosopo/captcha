---
"@prosopo/client-bundle-example": patch
"@prosopo/client-example-server": patch
"@prosopo/provider-mock": patch
"@prosopo/config": patch
"@prosopo/scripts": patch
"@prosopo/workspace": patch
"@prosopo/procaptcha-integration-build-config": patch
"@prosopo/account": patch
"@prosopo/api": patch
"@prosopo/api-express-router": patch
"@prosopo/api-route": patch
"@prosopo/cli": patch
"@prosopo/common": patch
"@prosopo/database": patch
"@prosopo/datasets": patch
"@prosopo/datasets-fs": patch
"@prosopo/detector": patch
"@prosopo/dotenv": patch
"@prosopo/env": patch
"@prosopo/fingerprint": patch
"@prosopo/ipinfo": patch
"@prosopo/keyring": patch
"@prosopo/load-balancer": patch
"@prosopo/locale": patch
"@prosopo/logger": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-wrapper": patch
"@prosopo/provider": patch
"@prosopo/redis-client": patch
"@prosopo/server": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/types-env": patch
"@prosopo/user-access-policy": patch
"@prosopo/util": patch
"@prosopo/util-crypto": patch
"@prosopo/widget-skeleton": patch
---

chore(deps): batch the outstanding dependabot bumps into one upgrade

Rolls up dependabot PRs #3112, #3127-#3134 and #3159. Majors: `mongoose`
8 -> 9, `bson` 6 -> 7, `@noble/curves` 1 -> 2, `@polkadot/util-crypto`
13 -> 14, `@typegoose/auto-increment` 4 -> 5, `@babel/preset-env` 7 -> 8,
`@types/jsdom` 21 -> 30, `@types/bcrypt` 5 -> 6, `@actions/github` 6 -> 9,
`testcontainers` 11 -> 12. The rest are minor/patch.

Code changes the majors forced:
- `@noble/curves` v2 requires `.js` specifiers and renamed the point API,
  so `secp256k1.ProjectivePoint.fromHex(...).toRawBytes()` becomes
  `secp256k1.Point.fromBytes(...).toBytes()`, `RistrettoPoint` becomes
  `ristretto255.Point`, and `abstract/utils` moves to `utils.js`.
- mongoose 9 drops `RootFilterQuery` (now `QueryFilter`), no longer sets
  `background: true` on schema indexes by default, and no longer declares
  `id` on `Document`, which un-hid a mismatch between
  `updateDappUserCommitment`'s `Hash` parameter and the `string` `id` it
  filters on.
- `vitest`/`@vitest/coverage-v8` go to 4.1.11 alongside dependabot's
  `@vitest/spy` bump; leaving them at 4.1.10 installed a second copy of
  `@vitest/spy` and broke type inference in the provider test utils.
