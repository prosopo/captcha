# @prosopo/types

## 3.10.2
### Patch Changes

- 93fa086: Add decision engine endpoints

## 3.10.1
### Patch Changes

- cde7550: enhance/frictionless-headers-db-field

## 3.10.0
### Minor Changes

- ad6d622: Separate types from mongoose schemas to avoid bundling mongoose in frontend

## 3.9.0
### Minor Changes

- ff58a70: Load the geolocation service at startup only

## 3.8.4
### Patch Changes

- d2431cd: Allow IP validation rules to be disabled

## 3.8.3
### Patch Changes

- bd6995b: Adding UAP based geoblocking rules

## 3.8.2
### Patch Changes

- 9633e58: Add captcha type to decision machine and run on image verification"

## 3.8.1
### Patch Changes

- f52a5c1: Adding decision machine to provider for behavior detection

## 3.8.0
### Minor Changes

- 1ee3d80: More API fixes

### Patch Changes

- 3acc333: Add JWT issuance to keypairs
- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- 3acc333: Release 3.3.0
- Updated dependencies [a53526b]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [a8faa9a]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/util@3.2.5
  - @prosopo/util-crypto@13.5.29
  - @prosopo/locale@3.1.28

## 3.7.2
### Patch Changes

- 141e462: Capture correct event

## 3.7.1
### Patch Changes

- 345b25b: pow coord

## 3.7.0
### Minor Changes

- ce70a2b: Add context-aware entropy calculation for WebView and default contexts
  
  - Added ContextType enum to distinguish between WebView and default browser contexts
  - Implemented context-specific entropy calculation and storage
  - Created clientContextEntropy collection with automatic timestamp management
  - Removed legacy clientEntropy table in favor of context-specific approach
  - Added helper functions for context determination and threshold retrieval
  - Included comprehensive unit tests for context validation logic

### Patch Changes

- c2b940f: Properly save context type settings
- f6b5094: Allow different context to override default
- Updated dependencies [e01227b]
  - @prosopo/locale@3.1.27

## 3.6.4
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/locale@3.1.26
  - @prosopo/util@3.2.4
  - @prosopo/util-crypto@13.5.28

## 3.6.3
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/locale@3.1.25
  - @prosopo/util@3.2.3
  - @prosopo/util-crypto@13.5.27

## 3.6.2
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/util-crypto@13.5.26
  - @prosopo/locale@3.1.24
  - @prosopo/util@3.2.2

## 3.6.1
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/locale@3.1.23
  - @prosopo/util@3.2.1
  - @prosopo/util-crypto@13.5.25

## 3.6.0
### Minor Changes

- bb5f41c: Context awareness

### Patch Changes

- 15ae7cf: Change slider defaults
- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/util@3.2.0
  - @prosopo/util-crypto@13.5.24
  - @prosopo/locale@3.1.22
  - @prosopo/config@3.1.22

## 3.5.11
### Patch Changes

- 8f1773a: Tweak config

## 3.5.10
### Patch Changes

- cb8ab85: head entropy for bot detection

## 3.5.9
### Patch Changes

- 43907e8: Convert timestamp fields from numbers to Date objects throughout codebase
- 7101036: Force consistent IPs logic
- Updated dependencies [005ce66]
  - @prosopo/util@3.1.7

## 3.5.8
### Patch Changes

- e5c259d: .

## 3.5.7
### Patch Changes

- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21
  - @prosopo/locale@3.1.21
  - @prosopo/util@3.1.6
  - @prosopo/util-crypto@13.5.23

## 3.5.6
### Patch Changes

- 5d11a81: Adding maintenance mode

## 3.5.5
### Patch Changes

- 494c5a8: Updated payload

## 3.5.4
### Patch Changes

- 08ff50f: Hot fix country code

## 3.5.3
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/locale@3.1.20
  - @prosopo/util@3.1.5
  - @prosopo/util-crypto@13.5.22

## 3.5.2
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/util-crypto@13.5.21
  - @prosopo/locale@3.1.19
  - @prosopo/util@3.1.4
  - @prosopo/config@3.1.19

## 3.5.1
### Patch Changes

- 52cd544: Integrity checks
- b117ba3: Hot fix country code
- 50c4120: Release 3.4.3
- Updated dependencies [50c4120]
  - @prosopo/util-crypto@13.5.20
  - @prosopo/locale@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/config@3.1.18

## 3.5.0
### Minor Changes

- e20ad6b: IP country overrides

### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
  - @prosopo/util-crypto@13.5.19
  - @prosopo/locale@3.1.17
  - @prosopo/util@3.1.2
  - @prosopo/config@3.1.17

## 3.4.1
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
  - @prosopo/util-crypto@13.5.18
  - @prosopo/locale@3.1.16
  - @prosopo/util@3.1.1
  - @prosopo/config@3.1.16

## 3.4.0
### Minor Changes

- 6768f14: Update salt

### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/util-crypto@13.5.17
  - @prosopo/locale@3.1.15
  - @prosopo/util@3.1.0
  - @prosopo/config@3.1.15

## 3.3.0
### Minor Changes

- 97edf3f: Adding dom manip checks

### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/util-crypto@13.5.16
  - @prosopo/locale@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/config@3.1.14

## 3.2.1
### Patch Changes

- 509be28: Fix IP conditions logic
- 008d112: Release 3.3.0
- Updated dependencies [008d112]
  - @prosopo/util-crypto@13.5.15
  - @prosopo/locale@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/config@3.1.13

## 3.2.0
### Minor Changes

- cf48565: Store additional details. Remove duplicate indexes.

### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [0824221]
  - @prosopo/util-crypto@13.5.14
  - @prosopo/locale@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/config@3.1.12

## 3.1.4
### Patch Changes

- 0d1a33e: Adding ipcomparison service with user features
- 0d1a33e: Adding ip comparison service
- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/util-crypto@13.5.13
  - @prosopo/util@3.0.14
  - @prosopo/config@3.1.11

## 3.1.3
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/util-crypto@13.5.12
  - @prosopo/locale@3.1.10
  - @prosopo/util@3.0.13
  - @prosopo/config@3.1.10

## 3.1.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- 1249ce0: Be more lenient with random provider selection
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [809b984]
  - @prosopo/util-crypto@13.5.11
  - @prosopo/locale@3.1.9
  - @prosopo/util@3.0.12
  - @prosopo/config@3.1.9

## 3.1.1
### Patch Changes

- 1f980c4: Fix types mismatch in decryption
- 6fe8570: Release 3.2.0
- Updated dependencies [6fe8570]
  - @prosopo/util-crypto@13.5.10
  - @prosopo/locale@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/config@3.1.8

## 3.1.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
  - @prosopo/util-crypto@13.5.9
  - @prosopo/locale@3.1.7
  - @prosopo/util@3.0.10
  - @prosopo/config@3.1.7

## 3.0.10
### Patch Changes

- Updated dependencies [9eed772]
- Updated dependencies [ebb0168]
  - @prosopo/config@3.1.6
  - @prosopo/util@3.0.9
  - @prosopo/locale@3.1.6
  - @prosopo/util-crypto@13.5.8

## 3.0.9
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/locale@3.1.5
  - @prosopo/util-crypto@13.5.7
  - @prosopo/util@3.0.8

## 3.0.8
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/common@3.1.4
  - @prosopo/locale@3.1.4

## 3.0.7
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/locale@3.1.3

## 3.0.6
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
- df4e030: Revising UAP rule getters
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
  - @prosopo/common@3.1.2
  - @prosopo/config@3.1.3
  - @prosopo/locale@3.1.2

## 3.0.5
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/common@3.1.1
  - @prosopo/locale@3.1.1
  - @prosopo/config@3.1.2

## 3.0.4
### Patch Changes

- 93d5e50: ensure packages have @prosopo/config as dep for vite configs
- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 93d5e50: fix missing dep for @prosopo/config
- 63519d7: Tests
- 3573f0b: standardise all vite based npm scripts for bundling
- 2d0dd8a: Integration tests for UAPs
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/locale@3.1.0
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.0.3
### Patch Changes

- b0d7207: Types for proper rotation

## 3.0.2
### Patch Changes

- f682f0c: Moving type and fixing i18n config
- Updated dependencies [f682f0c]
  - @prosopo/locale@3.0.2
  - @prosopo/common@3.0.2

## 3.0.1
### Patch Changes

- Updated dependencies [87bd9bc]
  - @prosopo/locale@3.0.1
  - @prosopo/common@3.0.1

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/locale@3.0.0

## 2.10.0
### Minor Changes

- aee3efe: Add healthz endpoint

## 2.9.1
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/common@2.7.2

## 2.9.0
### Minor Changes

- 30bb383: Making sure verify works and derived accounts

### Patch Changes

  - @prosopo/common@2.7.1

## 2.8.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0

## 2.7.1

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1

## 2.7.0

### Minor Changes

- 6e1aef6: Add IP check when verifying

## 2.6.2

### Patch Changes

- 6ff193a: Change settings type

## 2.6.1

### Patch Changes

- 52feffc: Adjustable difficulty img captcha

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/common@2.6.0
  - @prosopo/locale@2.6.0
