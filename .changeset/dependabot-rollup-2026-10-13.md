---
"@prosopo/account": patch
"@prosopo/cli": patch
"@prosopo/client-example-server": patch
"@prosopo/config": patch
"@prosopo/database": patch
"@prosopo/datasets-fs": patch
"@prosopo/icon-order-assets": patch
"@prosopo/native-ja4": patch
"@prosopo/native-merkle": patch
"@prosopo/native-puzzle": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-integration-build-config": patch
"@prosopo/provider": patch
"@prosopo/provider-mock": patch
"@prosopo/puzzle-assets": patch
"@prosopo/redis-client": patch
"@prosopo/scripts": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/user-access-policy": patch
"@prosopo/util": patch
"@prosopo/workspace": patch
---

Roll up the open Dependabot updates: 25 minor and patch bumps, sharp 0.35.5, pbkdf2 3.1.7, smoldot 3.6.0, and two GitHub Actions bumps.

Babel moves to 8. Its plugins and babel-loader move with it, because Babel 8 refuses to load v7 plugins. The import-attributes syntax plugin is gone: Babel 8 parses `with { type: "json" }` by default. The unused `@rollup/plugin-babel` is removed.

`@polkadot/types` and `@polkadot/types-codec` move to 17.0.2. Without that, `@polkadot/extension-*` 0.64 pulls in a second copy of the types and the widget packages stop typechecking.
