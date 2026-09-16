# @prosopo/native-merkle

## 0.0.5
### Patch Changes

- 6f57ee9: chore(deps-dev): bump @napi-rs/cli from 2.18.4 to 3.8.6
- 6fd727c: Publish `@prosopo/native-merkle` and `@prosopo/puzzle-assets` to npm instead of keeping them private.
  
  These are the last two entries in `@prosopo/provider`'s `dependencies` that carried `"private": true` and so were never published. With `@prosopo/native-ja4` already fixed, dropping `private` here makes `npm i @prosopo/provider` resolve for the first time since 5.5.0 — until now it failed with an `E404` on whichever unpublished dependency npm reached first. The Docker image and the bundled CLI build the workspace from source and never resolve these against the registry, which is why the breakage stayed invisible.
  
  `native-merkle` also gains `repository`, because the release workflow publishes with `NPM_CONFIG_PROVENANCE=true` and provenance attestation verifies `repository.url` against the OIDC claim for `prosopo/captcha`. `puzzle-assets` already declared `repository`, `author`, `bugs` and `homepage`, so it needed only the `private` line removed.
  
  Neither tarball changes shape. `native-merkle` keeps its `files` allowlist of `index.js`, `index.d.ts` and the prebuilt `*.node`, and stays `x86_64-unknown-linux-gnu` only — it resolves on linux-x64-gnu and throws napi's "Unsupported architecture" elsewhere, exactly as it does inside the workspace today. `puzzle-assets` ships `dist/` with both the root and `./browser` subpath exports, and keeps its `sharp` runtime dependency.

## 0.0.4
### Patch Changes

- 8fce190: Remove the darwin-arm64 native binaries committed by mistake in #3162, and ignore non-linux builds so a local build cannot be committed again. `napi.targets` in both packages is `x86_64-unknown-linux-gnu`; only that artefact belongs in the tree.

## 0.0.3
### Patch Changes

- 7faca4d: Add TLS timings into session doc

## 0.0.2
### Patch Changes

- 6db5d8b: Move image-captcha merkle tree computation and per-solution leaf hashing to a Rust napi module (@prosopo/native-merkle). ~4× faster on realistic 9-solution commits. Extends the cli bundle plugin so multiple native-* .node files can coexist without basename collision.
