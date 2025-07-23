# @prosopo/server

## 2.9.16
### Patch Changes

  - @prosopo/api@3.1.5

## 2.9.15
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/api@3.1.4
  - @prosopo/keyring@2.8.10
  - @prosopo/load-balancer@2.6.18
  - @prosopo/types@3.0.7

## 2.9.14
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
- 91bbe87: configure typecheck before bundle for vue packages
- 91bbe87: make typecheck script always recompile
- 346e092: NODE_ENV default to "development"
- 5d36e05: remove tsc --force
- Updated dependencies [828066d]
- Updated dependencies [df4e030]
- Updated dependencies [91bbe87]
- Updated dependencies [3ef4fd2]
- Updated dependencies [91bbe87]
- Updated dependencies [346e092]
- Updated dependencies [5d36e05]
  - @prosopo/load-balancer@2.6.17
  - @prosopo/common@3.1.2
  - @prosopo/types@3.0.6
  - @prosopo/api@3.1.3
  - @prosopo/config@3.1.3
  - @prosopo/keyring@2.8.9

## 2.9.13
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/load-balancer@2.6.16
  - @prosopo/keyring@2.8.8
  - @prosopo/common@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/api@3.1.2
  - @prosopo/config@3.1.2

## 2.9.12
### Patch Changes

- 93d5e50: ensure packages have @prosopo/config as dep for vite configs
- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 93d5e50: fix missing dep for @prosopo/config
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/keyring@2.8.7
  - @prosopo/types@3.0.4
  - @prosopo/load-balancer@2.6.15
  - @prosopo/common@3.1.0
  - @prosopo/api@3.1.1
  - @prosopo/config@3.1.1

## 2.9.11
### Patch Changes

- Updated dependencies [b7c3258]
  - @prosopo/api@3.1.0

## 2.9.10
### Patch Changes

  - @prosopo/api@3.0.8

## 2.9.9
### Patch Changes

  - @prosopo/api@3.0.7

## 2.9.8
### Patch Changes

- Updated dependencies [b0d7207]
  - @prosopo/types@3.0.3
  - @prosopo/api@3.0.6
  - @prosopo/keyring@2.8.6
  - @prosopo/load-balancer@2.6.14

## 2.9.7
### Patch Changes

  - @prosopo/api@3.0.5
  - @prosopo/load-balancer@2.6.13

## 2.9.6
### Patch Changes

  - @prosopo/api@3.0.4
  - @prosopo/load-balancer@2.6.12

## 2.9.5
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/types@3.0.2
  - @prosopo/common@3.0.2
  - @prosopo/api@3.0.3
  - @prosopo/keyring@2.8.5
  - @prosopo/load-balancer@2.6.11

## 2.9.4
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/keyring@2.8.4
  - @prosopo/load-balancer@2.6.10
  - @prosopo/api@3.0.2

## 2.9.3
### Patch Changes

  - @prosopo/api@3.0.1

## 2.9.2
### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/api@3.0.0
  - @prosopo/keyring@2.8.3
  - @prosopo/load-balancer@2.6.9

## 2.9.1
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0
  - @prosopo/api@2.7.2
  - @prosopo/keyring@2.8.2
  - @prosopo/load-balancer@2.6.8

## 2.9.0
### Minor Changes

- d5f2e95: Fix ip checking logic

## 2.8.1
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/load-balancer@2.6.7
  - @prosopo/keyring@2.8.1
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1
  - @prosopo/api@2.7.1

## 2.8.0
### Minor Changes

- d6de900: ip pass through

### Patch Changes

- Updated dependencies [d6de900]
  - @prosopo/api@2.7.0

## 2.7.1
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/keyring@2.8.0
  - @prosopo/types@2.9.0
  - @prosopo/common@2.7.1
  - @prosopo/api@2.6.6
  - @prosopo/load-balancer@2.6.6

## 2.7.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/keyring@2.7.0
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/load-balancer@2.6.5
  - @prosopo/api@2.6.5

## 2.6.4

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/keyring@2.6.4
  - @prosopo/load-balancer@2.6.4
  - @prosopo/types@2.7.1
  - @prosopo/api@2.6.4

## 2.6.3

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0
  - @prosopo/api@2.6.3
  - @prosopo/keyring@2.6.3
  - @prosopo/load-balancer@2.6.3

## 2.6.2

### Patch Changes

- Updated dependencies [6ff193a]
  - @prosopo/types@2.6.2
  - @prosopo/api@2.6.2
  - @prosopo/keyring@2.6.2
  - @prosopo/load-balancer@2.6.2

## 2.6.1

### Patch Changes

- Updated dependencies [52feffc]
  - @prosopo/types@2.6.1
  - @prosopo/api@2.6.1
  - @prosopo/keyring@2.6.1
  - @prosopo/load-balancer@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/api@2.6.0
  - @prosopo/common@2.6.0
  - @prosopo/keyring@2.6.0
  - @prosopo/load-balancer@2.6.0
  - @prosopo/types@2.6.0
