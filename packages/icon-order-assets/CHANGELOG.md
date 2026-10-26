# @prosopo/icon-order-assets

## 0.2.3
### Patch Changes

- 2086040: Each kind of build now writes to its own folder under dist: dist/esm (vite ESM), dist/cjs (vite CommonJS), dist/types (declarations), dist/tsc (plain tsc), dist/bundle and dist/bundle-webpack (bundles) and dist/native (the Rust addons). Turbo caches each folder separately, so building one variant no longer overwrites or invalidates another. Package exports point at the new folders; anything importing a file from dist by path has to add the variant folder.
  
  The Rust addons are no longer committed. They are built into dist/native, in debug for development and tests and fully optimised when NODE_ENV=production, so building them now needs a Rust toolchain.
  
  Code that found the repo root or its certificates by climbing a fixed number of folders up from its own file now starts from its package's folder instead (new `packageDir` in @prosopo/util/node). The fixed count stopped working once the build output moved one folder deeper.
- Updated dependencies [2086040]
  - @prosopo/puzzle-assets@0.2.4

## 0.2.2
### Patch Changes

- 46b97b7: Roll up the open Dependabot updates: express 5 (with `@types/express` 5), dotenv 18, undici 8, geolib 4, vitest 5, vite 8.1.6 everywhere, 17 minor and patch bumps (Babel, mongoose, i18next, ip-address, turbo and others), `@angular/router` in the Angular demo, and a GitHub Actions bump.
  
  The whole vitest family moves to 5.0.4, including `@vitest/coverage-v8`, because `@vitest/browser-playwright` 5 only works with vitest 5. The `@types/express-serve-static-core` override moves to 5.1.3 to match `@types/express` 5.
  
  `@prosopo/dotenv` now loads env files with `quiet: true`. Since dotenv 17, every load prints an "injected env" line to stderr unless told not to.
- Updated dependencies [46b97b7]
  - @prosopo/puzzle-assets@0.2.3

## 0.2.1
### Patch Changes

- 1f36456: Roll up the open Dependabot updates: 25 minor and patch bumps, sharp 0.35.5, pbkdf2 3.1.7, smoldot 3.6.0, and two GitHub Actions bumps.
  
  Babel moves to 8. Its plugins and babel-loader move with it, because Babel 8 refuses to load v7 plugins. The import-attributes syntax plugin is gone: Babel 8 parses `with { type: "json" }` by default. The unused `@rollup/plugin-babel` is removed.
  
  `@polkadot/types` and `@polkadot/types-codec` move to 17.0.2. Without that, `@polkadot/extension-*` 0.64 pulls in a second copy of the types and the widget packages stop typechecking.
- Updated dependencies [1f36456]
  - @prosopo/puzzle-assets@0.2.2

## 0.2.0
### Minor Changes

- e13d7a8: New captcha type: `iconOrder`. The user is shown a frame of icons and a legend, and clicks the legend's icons in the order given.
  
  Icon-order is off by default. Only Prosopo can switch it on for a site, with the `captchaTypeFeatureFlags.iconOrder` feature flag; the site owner cannot. A site without the flag is never served icon-order by any route, and the challenge endpoint refuses it. Once the flag is on, the owner can still keep icon-order out of the frictionless flow with `frictionlessTypes.iconOrder`, the same way as image and puzzle.
  
  The answer never leaves the provider. Icon positions are stored on the challenge record, and the widget receives only the rendered frame and legend. Grading checks order as well as position, and each icon's hit radius scales with its size. Verifying a token is single-use under concurrent requests.
  
  `@prosopo/icon-order-assets` draws the imagery, and `@prosopo/procaptcha-icon-order` is the widget. Its text is translated into every supported language.
  
  Puzzle and icon-order now share their server code: challenge and solution handlers, the verify route, the submit and verify pipeline, and the database record methods. The widget code they have in common moves into `@prosopo/procaptcha-common`: the lazy mount wrapper, manager expiry and dispose, spent-session handling, behavioural data encryption and trusted click coordinates. Puzzle's behaviour is unchanged.
  
  The demo playground has icon-order pages, and there is an end-to-end test for it.

### Patch Changes

- Updated dependencies [e13d7a8]
  - @prosopo/puzzle-assets@0.2.1
