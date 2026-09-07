---
"@prosopo/native-merkle": patch
"@prosopo/puzzle-assets": patch
---

Publish `@prosopo/native-merkle` and `@prosopo/puzzle-assets` to npm instead of keeping them private.

These are the last two entries in `@prosopo/provider`'s `dependencies` that carried `"private": true` and so were never published. With `@prosopo/native-ja4` already fixed, dropping `private` here makes `npm i @prosopo/provider` resolve for the first time since 5.5.0 — until now it failed with an `E404` on whichever unpublished dependency npm reached first. The Docker image and the bundled CLI build the workspace from source and never resolve these against the registry, which is why the breakage stayed invisible.

`native-merkle` also gains `repository`, because the release workflow publishes with `NPM_CONFIG_PROVENANCE=true` and provenance attestation verifies `repository.url` against the OIDC claim for `prosopo/captcha`. `puzzle-assets` already declared `repository`, `author`, `bugs` and `homepage`, so it needed only the `private` line removed.

Neither tarball changes shape. `native-merkle` keeps its `files` allowlist of `index.js`, `index.d.ts` and the prebuilt `*.node`, and stays `x86_64-unknown-linux-gnu` only — it resolves on linux-x64-gnu and throws napi's "Unsupported architecture" elsewhere, exactly as it does inside the workspace today. `puzzle-assets` ships `dist/` with both the root and `./browser` subpath exports, and keeps its `sharp` runtime dependency.
