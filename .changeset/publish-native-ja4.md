---
"@prosopo/native-ja4": patch
---

Publish `@prosopo/native-ja4` to npm instead of keeping it private.

`@prosopo/provider` has listed `@prosopo/native-ja4` in its `dependencies` since 5.5.0, but the package carried `"private": true` and so was never published. `npm i @prosopo/provider` has therefore failed for every release since, on an `E404` for a package that does not exist on the registry. Nobody hit it because provider is consumed through the Docker image and the bundled CLI, both of which build the workspace from source and never resolve the dependency against npm.

Dropping `private` lets `changeset publish` pick the package up like every other workspace package. `repository` is added because the release workflow publishes with `NPM_CONFIG_PROVENANCE=true`, and provenance attestation requires a `repository.url` on the manifest that matches the OIDC claim for `prosopo/captcha`.

The tarball is unchanged in shape: `files` already limited it to `index.js`, `index.d.ts` and the prebuilt `*.node` binary. `napi.targets` is still `x86_64-unknown-linux-gnu` only, so the package resolves on linux-x64-gnu and throws the napi "Unsupported architecture" error elsewhere — the same behaviour it has always had inside the workspace.

`@prosopo/native-merkle` and `@prosopo/puzzle-assets` are also private, also unpublished, and also in provider's `dependencies`, so `npm i @prosopo/provider` still fails until they get the same treatment.
