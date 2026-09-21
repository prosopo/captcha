---
"@prosopo/util-crypto": patch
"@prosopo/util": patch
"@prosopo/keyring": patch
"@prosopo/web-bot-auth": patch
"@prosopo/provider": patch
"@prosopo/datasets-fs": patch
---

Ship one copy of each crypto library in the widget instead of two or three.

The bundle contained three separate copies of `@noble/hashes` and two of `@polkadot/util`, because different packages asked for different major versions and npm installed each one in its own folder. Same code, bundled repeatedly. The widget's eager payload drops by about 6KB gzipped.

Two stale version pins caused it:

- `@prosopo/util-crypto` asked for `@noble/hashes` 1.8.0 while its own dependencies `@noble/curves` and `@scure/sr25519` asked for 2.4.0, so npm installed both majors. Everything is now on 2.4.0. The v2 import paths changed (`@noble/hashes/sha256` is now `@noble/hashes/sha2.js`, `blake2b` is `blake2.js`); the functions themselves are unchanged.
- `@prosopo/util-crypto` asked for `@polkadot/x-randomvalues` 13.5.7, which in turn demands exactly `@polkadot/util` 13.5.7. Every other package in the repo asks for 14.0.3, so npm put the old one in the shared folder and gave each package its own private copy of the new one. Bumping that single pin to 14.0.3 leaves one shared copy. As a side effect `@prosopo/util-crypto` now gets the `@scure/base` 2.4.0 it always asked for, rather than the 1.2.6 it was silently given.

`@prosopo/keyring` no longer depends on `@polkadot/util-crypto`. It was used for one type, which `@prosopo/util-crypto` already exports.

The repo root now names the versions the workspace standardises on (`@noble/hashes`, `@noble/curves`, `@scure/base`, `@scure/sr25519`), which is what keeps npm putting them in the shared folder. Older majors are still installed for the Polkadot web3 packages that require them; those load only in web3 mode and are unaffected.

Covered by the existing test suites for each package, all passing unchanged.
