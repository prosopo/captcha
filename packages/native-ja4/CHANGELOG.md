# @prosopo/native-ja4

## 0.0.9
### Patch Changes

- 46b97b7: Roll up the open Dependabot updates: express 5 (with `@types/express` 5), dotenv 18, undici 8, geolib 4, vitest 5, vite 8.1.6 everywhere, 17 minor and patch bumps (Babel, mongoose, i18next, ip-address, turbo and others), `@angular/router` in the Angular demo, and a GitHub Actions bump.
  
  The whole vitest family moves to 5.0.4, including `@vitest/coverage-v8`, because `@vitest/browser-playwright` 5 only works with vitest 5. The `@types/express-serve-static-core` override moves to 5.1.3 to match `@types/express` 5.
  
  `@prosopo/dotenv` now loads env files with `quiet: true`. Since dotenv 17, every load prints an "injected env" line to stderr unless told not to.

## 0.0.8
### Patch Changes

- 1f36456: Roll up the open Dependabot updates: 25 minor and patch bumps, sharp 0.35.5, pbkdf2 3.1.7, smoldot 3.6.0, and two GitHub Actions bumps.
  
  Babel moves to 8. Its plugins and babel-loader move with it, because Babel 8 refuses to load v7 plugins. The import-attributes syntax plugin is gone: Babel 8 parses `with { type: "json" }` by default. The unused `@rollup/plugin-babel` is removed.
  
  `@polkadot/types` and `@polkadot/types-codec` move to 17.0.2. Without that, `@polkadot/extension-*` 0.64 pulls in a second copy of the types and the widget packages stop typechecking.

## 0.0.7
### Patch Changes

- 0a4ae2f: A malformed TLS ClientHello no longer kills the provider process. The JA4 parser indexes extension bytes without checking they exist, and a panic inside the native module aborted Node outright. The binding now catches the panic and throws an ordinary error, which the provider already turns into the default JA4 fingerprint. Fingerprints for well-formed hellos are unchanged.

## 0.0.6
### Patch Changes

- f4e4a83: chore(deps): roll up the open dependabot bumps (react 19.3, mongoose 9.10, @polkadot/util 14, redis 6, cron-parser 5, react-i18next 17 with i18next 26, @scure/base 2, cypress 16, rollup/babel plugin majors, vitest 4.1.11, angular 20.3.28, js-yaml)

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
