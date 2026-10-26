# @prosopo/native-merkle

## 0.0.9
### Patch Changes

- f9c3fc3: The Rust addons now build in debug mode unless `NODE_ENV=production`, so local builds and CI tests stop paying for full link-time optimisation. Production builds (npm publish, the provider image) still run `build:release` with full LTO. Dependencies are optimised even in debug so tests stay fast, and the CI `cargo test` job now runs in debug with a cargo cache instead of a cold release build.
- 2086040: Each kind of build now writes to its own folder under dist: dist/esm (vite ESM), dist/cjs (vite CommonJS), dist/types (declarations), dist/tsc (plain tsc), dist/bundle and dist/bundle-webpack (bundles) and dist/native (the Rust addons). Turbo caches each folder separately, so building one variant no longer overwrites or invalidates another. Package exports point at the new folders; anything importing a file from dist by path has to add the variant folder.
  
  The Rust addons are no longer committed. They are built into dist/native, in debug for development and tests and fully optimised when NODE_ENV=production, so building them now needs a Rust toolchain.
  
  Code that found the repo root or its certificates by climbing a fixed number of folders up from its own file now starts from its package's folder instead (new `packageDir` in @prosopo/util/node). The fixed count stopped working once the build output moved one folder deeper.

## 0.0.8
### Patch Changes

- 46b97b7: Roll up the open Dependabot updates: express 5 (with `@types/express` 5), dotenv 18, undici 8, geolib 4, vitest 5, vite 8.1.6 everywhere, 17 minor and patch bumps (Babel, mongoose, i18next, ip-address, turbo and others), `@angular/router` in the Angular demo, and a GitHub Actions bump.
  
  The whole vitest family moves to 5.0.4, including `@vitest/coverage-v8`, because `@vitest/browser-playwright` 5 only works with vitest 5. The `@types/express-serve-static-core` override moves to 5.1.3 to match `@types/express` 5.
  
  `@prosopo/dotenv` now loads env files with `quiet: true`. Since dotenv 17, every load prints an "injected env" line to stderr unless told not to.

## 0.0.7
### Patch Changes

- 1f36456: Roll up the open Dependabot updates: 25 minor and patch bumps, sharp 0.35.5, pbkdf2 3.1.7, smoldot 3.6.0, and two GitHub Actions bumps.
  
  Babel moves to 8. Its plugins and babel-loader move with it, because Babel 8 refuses to load v7 plugins. The import-attributes syntax plugin is gone: Babel 8 parses `with { type: "json" }` by default. The unused `@rollup/plugin-babel` is removed.
  
  `@polkadot/types` and `@polkadot/types-codec` move to 17.0.2. Without that, `@polkadot/extension-*` 0.64 pulls in a second copy of the types and the widget packages stop typechecking.

## 0.0.6
### Patch Changes

- f4e4a83: chore(deps): roll up the open dependabot bumps (react 19.3, mongoose 9.10, @polkadot/util 14, redis 6, cron-parser 5, react-i18next 17 with i18next 26, @scure/base 2, cypress 16, rollup/babel plugin majors, vitest 4.1.11, angular 20.3.28, js-yaml)

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
