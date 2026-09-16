# @prosopo/procaptcha-integration-build-config

## 1.1.31
### Patch Changes

- 89dd38a: chore(deps): batch the outstanding dependabot bumps into one upgrade
  
  Rolls up dependabot PRs #3112, #3127-#3134 and #3159. Majors: `mongoose`
  8 -> 9, `bson` 6 -> 7, `@noble/curves` 1 -> 2, `@polkadot/util-crypto`
  13 -> 14, `@typegoose/auto-increment` 4 -> 5, `@babel/preset-env` 7 -> 8,
  `@types/jsdom` 21 -> 30, `@types/bcrypt` 5 -> 6, `@actions/github` 6 -> 9,
  `testcontainers` 11 -> 12. The rest are minor/patch.
  
  Code changes the majors forced:
  - `@noble/curves` v2 requires `.js` specifiers and renamed the point API,
    so `secp256k1.ProjectivePoint.fromHex(...).toRawBytes()` becomes
    `secp256k1.Point.fromBytes(...).toBytes()`, `RistrettoPoint` becomes
    `ristretto255.Point`, and `abstract/utils` moves to `utils.js`.
  - mongoose 9 drops `RootFilterQuery` (now `QueryFilter`), no longer sets
    `background: true` on schema indexes by default, and no longer declares
    `id` on `Document`, which un-hid a mismatch between
    `updateDappUserCommitment`'s `Hash` parameter and the `string` `id` it
    filters on.
  - mongoose 9 rejects an aggregation-pipeline update (an array) unless the
    call passes `updatePipeline: true`, so the six pipeline writes in
    `ProviderDatabase` now opt in explicitly.
  - mongoose 9's `castUpdate` throws on a `$setOnInsert` key inside `$set`.
    `storeUserImageCaptchaSolution` passed its record straight in as the
    update, and mongoose's `moveImmutableProperties` mutates that object on
    an upsert -- adding the very `$setOnInsert` key the record then carried
    into `CentralDbStreamer.streamImageRecord`. Image records stopped
    reaching the central DB (the streamer is fire-and-forget, so it only
    logged) and signup verification returned 500. The update is now an
    explicit `$set` over a shallow copy.
  - `@prosopo/database` moves from mongodb 6.20 to 7.5 to match the driver
    mongoose 9 pulls, so bson 7 is the only copy resolvable in the package.
  - `vitest`/`@vitest/coverage-v8` go to 4.1.11 alongside dependabot's
    `@vitest/spy` bump; leaving them at 4.1.10 installed a second copy of
    `@vitest/spy` and broke type inference in the provider test utils.

## 1.1.30
### Patch Changes

- 6205500: Add unit and type tests for the integration vite config builder, and fix the
  defects they found:
  
  - The library file name ignored the format it was given and always returned
    `index.js`, so a package that asked for a second format wrote both builds over
    the same file. Non-`es` formats are now named after the format.
  - `deepmerge` cloned the caller's vite plugins, detaching each copy from the state
    it closed over. Merging no longer clones.
  - An empty `directory` silently resolved every path against the process working
    directory, and an empty `name` produced an unnamed library; both are now
    rejected.
  - `IntegrationConfigSettings` is exported, so a consumer's `vite.config.ts` can
    type its own settings.

## 1.1.29
### Patch Changes

- e14fce6: chore(deps): bump vite to 6.4.3 and mongoose to 8.24.1, and adjust types for the mongoose 8.24 Document/ObjectId changes

## 1.1.28
### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 3acc333: Release 3.3.0

## 1.1.27
### Patch Changes

- 7d5eb3f: bump

## 1.1.26
### Patch Changes

- 93d92a7: little bump for publish all

## 1.1.25
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep

## 1.1.24
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23

## 1.1.23
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/config@3.1.22

## 1.1.22
### Patch Changes

- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21

## 1.1.21
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20

## 1.1.20
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/config@3.1.19

## 1.1.19
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [50c4120]
  - @prosopo/config@3.1.18

## 1.1.18
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
  - @prosopo/config@3.1.17

## 1.1.17
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
  - @prosopo/config@3.1.16

## 1.1.16
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
  - @prosopo/config@3.1.15

## 1.1.15
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/config@3.1.14

## 1.1.14
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [008d112]
  - @prosopo/config@3.1.13

## 1.1.13
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [0824221]
  - @prosopo/config@3.1.12

## 1.1.12
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [1a23649]
  - @prosopo/config@3.1.11

## 1.1.11
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/config@3.1.10

## 1.1.10
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [809b984]
  - @prosopo/config@3.1.9

## 1.1.9
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [6fe8570]
  - @prosopo/config@3.1.8

## 1.1.8
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
  - @prosopo/config@3.1.7

## 1.1.7
### Patch Changes

- Updated dependencies [9eed772]
  - @prosopo/config@3.1.6

## 1.1.6
### Patch Changes

- 6960643: lint detect missing and unneccessary imports

## 1.1.5
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5

## 1.1.4
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4

## 1.1.3
### Patch Changes

- 91d56e7: enable nx caching
- 828066d: remove empty test npm scripts, add missing npm test scripts
- 91bbe87: configure typecheck before bundle for vue packages
- 91bbe87: make typecheck script always recompile
- 346e092: NODE_ENV default to "development"
- 5d36e05: remove tsc --force
- Updated dependencies [828066d]
- Updated dependencies [91bbe87]
- Updated dependencies [3ef4fd2]
- Updated dependencies [91bbe87]
- Updated dependencies [346e092]
- Updated dependencies [5d36e05]
  - @prosopo/config@3.1.3

## 1.1.2
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/config@3.1.2

## 1.1.1
### Patch Changes

- 0f4bc06: Add CJS config to fix build
- 3573f0b: build using vite, typecheck using tsc
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/config@3.1.1

## 1.1.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied
