# @prosopo/config

## 3.3.10
### Patch Changes

- 721c5ba: Move JA4 TLS fingerprint computation to a Rust napi module (@prosopo/native-ja4). Provider-side JA4 middleware is ~2.7× faster on realistic ClientHellos. The cli bundle plugin now copies the .node binary next to the bundle so it works in the container.

## 3.3.9
### Patch Changes

- e46e0bd: Keep the server-only i18next backend out of frontend bundles.
  
  `i18next-fs-backend` has been on the frontend config's exclusion list for a long
  time, but it was still being bundled. `external` only ever matches a specifier
  exactly, and `i18nBackend.ts` imports the subpath `i18next-fs-backend/cjs`
  (i18next/i18next-fs-backend#57), which is a different string. So the fs backend
  shipped in the browser artifact along with its YAML, JSON5 and JSONC parsers.
  `i18next-http-middleware` — Express request handling — was never on the list at
  all.
  
  The subpath is now listed literally, and `i18next-http-middleware` joins the
  exclusion list.
  
  Both are listed one by one rather than by matching `pkg/*` against the whole
  exclusion list. That broader rule looks tidier but is wrong: the `vite` filter
  is a substring match, so it also selects `vite-plugin-node-polyfills`, and
  `vite-plugin-node-polyfills/shims/process` is injected into the served and IIFE
  bundles as a bare import. Externalising it leaves the browser unable to resolve
  the specifier and the widget dies on load.
  
  Measured on `@prosopo/procaptcha-bundle`, production mode:
  
  | | before | after |
  | --- | --- | --- |
  | `i18nBackend` chunk, raw | 153,593 | 788 |
  | all chunks, raw | 1,247,449 | 1,094,644 (−12.2%) |
  | all chunks, gzip | 474,695 | 434,408 (−8.5%) |
  
  This is not a first-paint change — the critical path is unchanged, because the
  chunk is only reachable through `loadI18next(true)` and the widget always calls
  `loadI18next(false, language)`. It is dead weight in the published artifact.
  
  No browser behaviour can regress: that chunk already imported `node:path`, which
  is already external, so it was never loadable in a browser to begin with. The
  i18next packages the browser does use — `http-backend`,
  `browser-languagedetector`, `chained-backend`, `resources-to-backend` — are
  unaffected and still bundled.

## 3.3.8
### Patch Changes

- bde0cb9: Enable whitespace minification for production frontend bundles.
  
  For a `lib` + `es` build, Vite downgrades `build.minify: true` to
  `{ compress: true, mangle: true, codegen: false }`, so bundles shipped compressed
  and mangled but still pretty-printed. Setting `output.minify` explicitly fixes it.
  
  On `@prosopo/procaptcha-bundle`, the critical path drops 22.5% raw (658KB → 510KB)
  and 9.6% gzipped. Chunk membership is unchanged. Production builds only.

## 3.3.7
### Patch Changes

- a6518a1: Add unit tests for the shared build config: dependency resolution, the vite bundle and library configs, the plugin set and the translations plugin. No behaviour changes.
- 2aabe73: Remove the client-controlled `detectorUnavailable` frictionless bypass. A client could set the flag and be handed a PoW challenge without any detection running. The flag is gone from the wire format, the API client and the widget; the only remaining bypasses are provider-side (maintenance mode, empty detector bundle pool).
  
  The frictionless decision machine now gates on payload presence after the access-rule ladder: no token serves a 3-round image captcha, a token without its head hash serves a 2-round one.

## 3.3.6
### Patch Changes

- c2ab027: chore(deps-dev): bump webpack-dev-server from 5.2.6 to 6.0.0

## 3.3.5
### Patch Changes

- 0e1171c: chore(deps): combined dependabot bumps (lodash, webpack-dev-server, sharp, i18next-http-middleware, actions/setup-node and transitive security updates)
- cb1b0b2: Honour /*#__PURE__*/ annotations when tree-shaking. Rolldown has no
  `treeshake.preset`, so Rollup's "smallest" could not be carried across in the
  Vite 8 upgrade; ignoring pure annotations retained dead library code that every
  consumer shipped. Cuts ~17KB gzip off the procaptcha widget bundle with a
  byte-identical detector bundle.
- 9fba3d3: Build workspace declarations before running tests. `turbo run test` depended only on `@prosopo/config#build`, so a package's dependencies were present in `dist` as bundled JavaScript with no `.d.ts`. Type checking then fell back to the compiled JS, which reports types as values and floods the run with implicit-any errors from other packages' output.
- e14fce6: chore(deps): bump vite to 6.4.3 and mongoose to 8.24.1, and adjust types for the mongoose 8.24 Document/ObjectId changes
- 89effc8: test(workspace): unit + type tests, fix root-path encoding, stale getters and coverage for non-`packages/` workspaces
  
  - `getRootDir` used `new URL(...).pathname`, which is percent-encoded — a
    checkout under a path containing a space or a `#` produced `%20`/`%23` and
    every derived path failed to resolve. Now uses `fileURLToPath`.
  - `getClientExampleDir` and `getDappExampleDir` returned paths for
    `demos/client-example` and `demos/dapp-example`, neither of which exists any
    more. Both were unused; removed.
  - `findWorkspaceRoot` takes an optional injected dependency set so the search
    can be tested against a synthetic tree, and no longer parses package.json
    into an implicitly-`any` value.
  - `ViteTestConfig` decided whether it was running inside a package by looking
    for `/packages/` in the cwd, so workspaces under `dev/`, `demos/` and
    `integration/` fell through to the repo-root globs and reported 0/0 coverage
    regardless of what their tests covered.

## 3.3.4
### Patch Changes

- fe996e4: feat(config): gate the rollup bundle visualiser behind `PROSOPO_BUNDLE_STATS`.
  
  The frontend bundle stats page (rollup-plugin-visualizer treemap) is now off by
  default. Set `PROSOPO_BUNDLE_STATS=true` to generate the report and open it in
  the browser once the bundle has been built; otherwise no report is emitted and
  no browser window is opened.

## 3.3.3
### Patch Changes

- e3c399d: chore(deps-dev): bump webpack-dev-server from 5.2.2 to 5.2.5 in /dev/config
- c523319: chore(deps-dev): bump webpack-dev-server from 5.2.2 to 5.2.5

## 3.3.2
### Patch Changes

- 7a97bba: chore(deps): bump esbuild from 0.25.9 to 0.28.1

## 3.3.1
### Patch Changes

- e1ea65f: Better spam email domain checking

## 3.3.0
### Minor Changes

- 6a4d57d: Move account creation into worker

### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- fa98e0a: make vitest run in shuffle mode
- 3acc333: Release 3.3.0

## 3.2.1
### Patch Changes

- 55fa825: Reinstate npm ls

## 3.2.0
### Minor Changes

- 30a2102: Remove problematic getDependencies step

## 3.1.27
### Patch Changes

- e01227b: add turbo

## 3.1.26
### Patch Changes

- 7d5eb3f: bump

## 3.1.25
### Patch Changes

- 93d92a7: correcting jsx import source

## 3.1.24
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11

## 3.1.23
### Patch Changes

- e926831: mega mini bump for all to trigger publish all

## 3.1.22
### Patch Changes

- 8ce9205: Change engine requirements
- df79c03: More dep fixes
- b6e98b2: Run npm audit

## 3.1.21
### Patch Changes

- b8185a4: feat/uap-rules-syncer

## 3.1.20
### Patch Changes

- 1e3a838: making webpack stuff external in vite config

## 3.1.19
### Patch Changes

- 5659b24: Release 3.4.4

## 3.1.18
### Patch Changes

- 50c4120: Release 3.4.3

## 3.1.17
### Patch Changes

- 618703f: Release 3.4.2

## 3.1.16
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1

## 3.1.15
### Patch Changes

- f3f7aec: Release 3.4.0

## 3.1.14
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4

## 3.1.13
### Patch Changes

- 008d112: Release 3.3.0

## 3.1.12
### Patch Changes

- 0824221: Release 3.2.4

## 3.1.11
### Patch Changes

- 1a23649: Release 3.2.3

## 3.1.10
### Patch Changes

- 657a827: Release 3.2.2

## 3.1.9
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- 809b984: make vite set esbuild jsx config based on env
- 809b984: set jsx config for esbuild from vite configs to avoid jsxDEV import bug

## 3.1.8
### Patch Changes

- 6fe8570: Release 3.2.0

## 3.1.7
### Patch Changes

- f304be9: Release 3.1.13

## 3.1.6
### Patch Changes

- 9eed772: Release 3.1.12

## 3.1.5
### Patch Changes

- 30e7d4d: Fixing coverage report and more damn linting

## 3.1.4
### Patch Changes

- 44ffda2: Dropping monitoring calls
- a49b538: Extra tests

## 3.1.3
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
- 91bbe87: configure typecheck before bundle for vue packages
- 3ef4fd2: remove cjs config
- 91bbe87: make typecheck script always recompile
- 346e092: NODE_ENV default to "development"
- 5d36e05: remove tsc --force

## 3.1.2
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile

## 3.1.1
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- 3573f0b: standardise all vite based npm scripts for bundling
- 2d0dd8a: Integration tests for UAPs

## 3.1.0
### Minor Changes

- 745cc89: Remove plugins from test config

## 3.0.1
### Patch Changes

- 5619b4b: Updating tsconfig paths

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

## 2.6.1
### Patch Changes

- 86c22b8: structured logging

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/common@2.6.0
  - @prosopo/types@2.6.0
  - @prosopo/util@2.6.0
