# @prosopo/lint

## 2.7.7
### Patch Changes

- e5b8b3d: allow tests to be in tsx, not just ts
- 387160a: handle undefined "includes" property on tsconfig files
- 6352635: allow engines to not be set in a package.json when linting
- 828066d: remove empty test npm scripts, add missing npm test scripts
- 91bbe87: configure typecheck before bundle for vue packages
- 91bbe87: make typecheck script always recompile
- 346e092: NODE_ENV default to "development"
- 5d36e05: remove tsc --force
- ae468a6: add json linting
- Updated dependencies [828066d]
- Updated dependencies [91bbe87]
- Updated dependencies [3ef4fd2]
- Updated dependencies [91bbe87]
- Updated dependencies [346e092]
- Updated dependencies [5d36e05]
  - @prosopo/config@3.1.3
  - @prosopo/util@3.0.5

## 2.7.6
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/util@3.0.4
  - @prosopo/config@3.1.2

## 2.7.5
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [52dbf21]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/util@3.0.3
  - @prosopo/config@3.1.1

## 2.7.4
### Patch Changes

  - @prosopo/util@3.0.2

## 2.7.3
### Patch Changes

  - @prosopo/util@3.0.1

## 2.7.2
### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/util@3.0.0

## 2.7.1
### Patch Changes

  - @prosopo/util@2.6.1

## 2.7.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/util@2.6.0
