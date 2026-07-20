---
"@prosopo/account": patch
"@prosopo/cli": patch
---

test(account): unit tests for CryptoWorker + ExtensionWeb2 keypair-derivation paths

Adds unit coverage for the code changed in the sr25519-in-worker perf PR (#2830):

- `cryptoWorker.unit.test.ts` — exercises the primitives (`entropyToMnemonic`, `mnemonicToMiniSecret`, `sr25519FromSeed`) the CryptoWorker's task dispatch calls into, and asserts the composed `entropyToKeypair` pipeline produces:
  - a keypair byte-equivalent (address + publicKey) to `keyring.addFromMnemonic(mnemonic)`
  - signatures that verify cross-instance (`addFromPair`-derived sig verifies against `addFromMnemonic`'s public key, and vice-versa)
  - deterministic output for identical entropy input
  - proper input-validation rejection for non-BIP39 entropy sizes
- `ExtensionWeb2.unit.test.ts` — mocks `getCryptoWorkerManager` + `getFingerprint` to lock down both branches of `createAccount`:
  - **worker branch** — `entropyToKeypair` resolves with raw bytes, `addFromPair` produces the expected address
  - **fallback branch** — `entropyToKeypair` rejects (worker unavailable), falls through to `entropyToMnemonic` + `addFromMnemonic` on main thread, produces the *same* address
  - A/B check confirming worker and fallback branches derive identical addresses for the same fingerprint — the invariant that lets us swap the paths without breaking session identity for users whose worker fails

Also wires up a `test` script and `vite.test.config.ts` in `@prosopo/account`, which had none previously.

**cli patch**: sync bump so the release cuts a new tag (root version follows `@prosopo/cli`) and the tag-triggered `publish_release` + downstream `deploy-procaptcha-bundle` republishes the CDN bundle with the sr25519-in-worker perf improvements from #2830. Without this, the `test(account)` bump alone leaves cli at its current version, the release script computes the same root version as the previous tag, and no new `v*.*.*` tag → no publish → no CDN republish.
