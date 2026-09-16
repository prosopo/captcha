# @prosopo/native-ja4

## 0.0.5
### Patch Changes

- 6f57ee9: chore(deps-dev): bump @napi-rs/cli from 2.18.4 to 3.8.6
- 9386e5e: Publish `@prosopo/native-ja4` to npm instead of keeping it private.
  
  `@prosopo/provider` has listed `@prosopo/native-ja4` in its `dependencies` since 5.5.0, but the package carried `"private": true` and so was never published. `npm i @prosopo/provider` has therefore failed for every release since, on an `E404` for a package that does not exist on the registry. Nobody hit it because provider is consumed through the Docker image and the bundled CLI, both of which build the workspace from source and never resolve the dependency against npm.
  
  Dropping `private` lets `changeset publish` pick the package up like every other workspace package. `repository` is added because the release workflow publishes with `NPM_CONFIG_PROVENANCE=true`, and provenance attestation requires a `repository.url` on the manifest that matches the OIDC claim for `prosopo/captcha`.
  
  The tarball is unchanged in shape: `files` already limited it to `index.js`, `index.d.ts` and the prebuilt `*.node` binary. `napi.targets` is still `x86_64-unknown-linux-gnu` only, so the package resolves on linux-x64-gnu and throws the napi "Unsupported architecture" error elsewhere — the same behaviour it has always had inside the workspace.
  
  `@prosopo/native-merkle` and `@prosopo/puzzle-assets` are also private, also unpublished, and also in provider's `dependencies`, so `npm i @prosopo/provider` still fails until they get the same treatment.

## 0.0.4
### Patch Changes

- 8fce190: Remove the darwin-arm64 native binaries committed by mistake in #3162, and ignore non-linux builds so a local build cannot be committed again. `napi.targets` in both packages is `x86_64-unknown-linux-gnu`; only that artefact belongs in the tree.

## 0.0.3
### Patch Changes

- 7faca4d: Add TLS timings into session doc

## 0.0.2
### Patch Changes

- 721c5ba: Move JA4 TLS fingerprint computation to a Rust napi module (@prosopo/native-ja4). Provider-side JA4 middleware is ~2.7× faster on realistic ClientHellos. The cli bundle plugin now copies the .node binary next to the bundle so it works in the container.
