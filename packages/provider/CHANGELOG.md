# @prosopo/provider

## 3.15.1
### Patch Changes

- 15254a3: Key cycle

## 3.15.0
### Minor Changes

- 6a4d57d: Move account creation into worker

### Patch Changes

- a53526b: enhance/pow-client-solution
- 3acc333: Update pow record at verify
- 3acc333: Add JWT issuance to keypairs
- 0a38892: feat/cross-os-testing
- 3acc333: ip parsing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- fe9fe22: adding api returns
- 3acc333: Release 3.3.0
- 4ac7ef0: Fixing provider side typing of collectors
- Updated dependencies [a53526b]
- Updated dependencies [3acc333]
- Updated dependencies [3acc333]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [17854a7]
- Updated dependencies [7543d17]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/util@3.2.5
  - @prosopo/types-database@4.1.5
  - @prosopo/database@3.6.6
  - @prosopo/api-express-router@3.0.47
  - @prosopo/util-crypto@13.5.29
  - @prosopo/keyring@2.9.0
  - @prosopo/types@3.8.0
  - @prosopo/user-access-policy@3.6.0
  - @prosopo/load-balancer@2.8.17
  - @prosopo/api-route@2.6.36
  - @prosopo/types-env@2.7.59
  - @prosopo/datasets@3.0.55
  - @prosopo/common@3.1.28
  - @prosopo/locale@3.1.28
  - @prosopo/api@3.1.41
  - @prosopo/env@3.2.35

## 3.14.7
### Patch Changes

- 41f8a82: Export userscope fn
- Updated dependencies [378a896]
- Updated dependencies [90fddd8]
  - @prosopo/user-access-policy@3.5.37
  - @prosopo/database@3.6.5
  - @prosopo/types-database@4.1.4
  - @prosopo/env@3.2.34
  - @prosopo/datasets@3.0.54
  - @prosopo/types-env@2.7.58
  - @prosopo/api-express-router@3.0.46

## 3.14.6
### Patch Changes

- c6faa77: Fix

## 3.14.5
### Patch Changes

- 7c475dc: Add headHash and coords fields to user access policies, and implement user access policy checks in server-side PoW verification
- Updated dependencies [7c475dc]
  - @prosopo/user-access-policy@3.5.36
  - @prosopo/database@3.6.4
  - @prosopo/types-database@4.1.3
  - @prosopo/env@3.2.33
  - @prosopo/datasets@3.0.53
  - @prosopo/types-env@2.7.57
  - @prosopo/api-express-router@3.0.45

## 3.14.4
### Patch Changes

- Updated dependencies [9ab5f11]
  - @prosopo/database@3.6.3
  - @prosopo/env@3.2.32
  - @prosopo/api-express-router@3.0.44

## 3.14.3
### Patch Changes

- ea5f1f8: Fix detectors

## 3.14.2
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/api@3.1.40
  - @prosopo/api-express-router@3.0.43
  - @prosopo/database@3.6.2
  - @prosopo/datasets@3.0.52
  - @prosopo/env@3.2.31
  - @prosopo/keyring@2.8.43
  - @prosopo/load-balancer@2.8.16
  - @prosopo/types-database@4.1.2
  - @prosopo/types-env@2.7.56
  - @prosopo/user-access-policy@3.5.35

## 3.14.1
### Patch Changes

- b5b21f8: Reduce Sample Size
- 345b25b: pow coord
- 1fd84de: Make sure session Ids are unique
- Updated dependencies [345b25b]
  - @prosopo/types-database@4.1.1
  - @prosopo/database@3.6.1
  - @prosopo/types@3.7.1
  - @prosopo/api@3.1.39
  - @prosopo/datasets@3.0.51
  - @prosopo/types-env@2.7.55
  - @prosopo/env@3.2.30
  - @prosopo/api-express-router@3.0.42
  - @prosopo/keyring@2.8.42
  - @prosopo/load-balancer@2.8.15
  - @prosopo/user-access-policy@3.5.34

## 3.14.0
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
- 5ad6f48: Fix detect webview iphones
- f6b5094: Allow different context to override default
- e3a8948: Run job for pro+ only
- e01227b: add turbo
- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
- Updated dependencies [e01227b]
  - @prosopo/types@3.7.0
  - @prosopo/types-database@4.1.0
  - @prosopo/database@3.6.0
  - @prosopo/locale@3.1.27
  - @prosopo/api@3.1.38
  - @prosopo/api-express-router@3.0.41
  - @prosopo/common@3.1.27
  - @prosopo/datasets@3.0.50
  - @prosopo/env@3.2.29
  - @prosopo/keyring@2.8.41
  - @prosopo/load-balancer@2.8.14
  - @prosopo/types-env@2.7.54
  - @prosopo/user-access-policy@3.5.33
  - @prosopo/api-route@2.6.35

## 3.13.7
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/api@3.1.37
  - @prosopo/api-express-router@3.0.40
  - @prosopo/api-route@2.6.34
  - @prosopo/common@3.1.26
  - @prosopo/database@3.5.6
  - @prosopo/datasets@3.0.49
  - @prosopo/env@3.2.28
  - @prosopo/keyring@2.8.40
  - @prosopo/load-balancer@2.8.13
  - @prosopo/locale@3.1.26
  - @prosopo/types@3.6.4
  - @prosopo/types-database@4.0.6
  - @prosopo/types-env@2.7.53
  - @prosopo/user-access-policy@3.5.32
  - @prosopo/util@3.2.4
  - @prosopo/util-crypto@13.5.28

## 3.13.6
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/api@3.1.36
  - @prosopo/api-express-router@3.0.39
  - @prosopo/api-route@2.6.33
  - @prosopo/common@3.1.25
  - @prosopo/database@3.5.5
  - @prosopo/datasets@3.0.48
  - @prosopo/env@3.2.27
  - @prosopo/keyring@2.8.39
  - @prosopo/load-balancer@2.8.12
  - @prosopo/locale@3.1.25
  - @prosopo/types@3.6.3
  - @prosopo/types-database@4.0.5
  - @prosopo/types-env@2.7.52
  - @prosopo/user-access-policy@3.5.31
  - @prosopo/util@3.2.3
  - @prosopo/util-crypto@13.5.27

## 3.13.5
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- e843e62: Adding more sensible punishment for invalid decryption key
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/api-express-router@3.0.38
  - @prosopo/user-access-policy@3.5.30
  - @prosopo/types-database@4.0.4
  - @prosopo/load-balancer@2.8.11
  - @prosopo/util-crypto@13.5.26
  - @prosopo/api-route@2.6.32
  - @prosopo/types-env@2.7.51
  - @prosopo/database@3.5.4
  - @prosopo/datasets@3.0.47
  - @prosopo/keyring@2.8.38
  - @prosopo/common@3.1.24
  - @prosopo/locale@3.1.24
  - @prosopo/types@3.6.2
  - @prosopo/util@3.2.2
  - @prosopo/api@3.1.35
  - @prosopo/env@3.2.26

## 3.13.4
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/api@3.1.34
  - @prosopo/api-express-router@3.0.37
  - @prosopo/api-route@2.6.31
  - @prosopo/common@3.1.23
  - @prosopo/database@3.5.3
  - @prosopo/datasets@3.0.46
  - @prosopo/env@3.2.25
  - @prosopo/keyring@2.8.37
  - @prosopo/load-balancer@2.8.10
  - @prosopo/locale@3.1.23
  - @prosopo/types@3.6.1
  - @prosopo/types-database@4.0.3
  - @prosopo/types-env@2.7.50
  - @prosopo/user-access-policy@3.5.29
  - @prosopo/util@3.2.1
  - @prosopo/util-crypto@13.5.25

## 3.13.3
### Patch Changes

- 3be9174: Create scheduled task status
- Updated dependencies [0a9887c]
  - @prosopo/types-database@4.0.2
  - @prosopo/database@3.5.2
  - @prosopo/datasets@3.0.45
  - @prosopo/types-env@2.7.49
  - @prosopo/env@3.2.24
  - @prosopo/api-express-router@3.0.36

## 3.13.2
### Patch Changes

- Updated dependencies [3e5d80a]
  - @prosopo/types-database@4.0.1
  - @prosopo/database@3.5.1
  - @prosopo/datasets@3.0.44
  - @prosopo/types-env@2.7.48
  - @prosopo/env@3.2.23
  - @prosopo/api-express-router@3.0.35

## 3.13.1
### Patch Changes

- 447179c: Fix config and client getter

## 3.13.0
### Minor Changes

- bb5f41c: Context awareness

### Patch Changes

- fdef625: fix maint mode
- 55a64c6: stop refresh image to pow
- aa8216a: bump
- 8ce9205: Change engine requirements
- 6ac5367: Less drastic reaction to bad sim score
- b6e98b2: Run npm audit
- 55a64c6: Persist sessions for user ip combinations
- Updated dependencies [8ce9205]
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [55a64c6]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [8f22479]
- Updated dependencies [b6e98b2]
- Updated dependencies [55a64c6]
  - @prosopo/user-access-policy@3.5.28
  - @prosopo/types@3.6.0
  - @prosopo/types-database@4.0.0
  - @prosopo/database@3.5.0
  - @prosopo/util@3.2.0
  - @prosopo/api-express-router@3.0.34
  - @prosopo/load-balancer@2.8.9
  - @prosopo/util-crypto@13.5.24
  - @prosopo/api-route@2.6.30
  - @prosopo/types-env@2.7.47
  - @prosopo/datasets@3.0.43
  - @prosopo/keyring@2.8.36
  - @prosopo/common@3.1.22
  - @prosopo/locale@3.1.22
  - @prosopo/api@3.1.33
  - @prosopo/env@3.2.22
  - @prosopo/config@3.1.22

## 3.12.14
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/api@3.1.32
  - @prosopo/api-express-router@3.0.33
  - @prosopo/database@3.4.13
  - @prosopo/datasets@3.0.42
  - @prosopo/env@3.2.21
  - @prosopo/keyring@2.8.35
  - @prosopo/load-balancer@2.8.8
  - @prosopo/types-database@3.3.13
  - @prosopo/types-env@2.7.46
  - @prosopo/user-access-policy@3.5.27

## 3.12.13
### Patch Changes

- cb8ab85: head entropy for bot detection
- Updated dependencies [cb8ab85]
  - @prosopo/types-database@3.3.12
  - @prosopo/types@3.5.10
  - @prosopo/api@3.1.31
  - @prosopo/database@3.4.12
  - @prosopo/datasets@3.0.41
  - @prosopo/types-env@2.7.45
  - @prosopo/api-express-router@3.0.32
  - @prosopo/env@3.2.20
  - @prosopo/keyring@2.8.34
  - @prosopo/load-balancer@2.8.7
  - @prosopo/user-access-policy@3.5.26

## 3.12.12
### Patch Changes

- 43907e8: Convert timestamp fields from numbers to Date objects throughout codebase
- b4639ec: Merge frictionless tokens into sessions
- 7101036: Force consistent IPs logic
- Updated dependencies [43907e8]
- Updated dependencies [b4639ec]
- Updated dependencies [005ce66]
- Updated dependencies [b58046d]
- Updated dependencies [7101036]
  - @prosopo/types-database@3.3.11
  - @prosopo/types@3.5.9
  - @prosopo/database@3.4.11
  - @prosopo/user-access-policy@3.5.25
  - @prosopo/load-balancer@2.8.6
  - @prosopo/util@3.1.7
  - @prosopo/datasets@3.0.40
  - @prosopo/types-env@2.7.44
  - @prosopo/api@3.1.30
  - @prosopo/api-express-router@3.0.31
  - @prosopo/env@3.2.19
  - @prosopo/keyring@2.8.33

## 3.12.11
### Patch Changes

- 4b6dc9d: Block at verify
- e5c259d: .
- 6420187: Save iframe
- Updated dependencies [b10a65f]
- Updated dependencies [e5c259d]
- Updated dependencies [6420187]
  - @prosopo/types-database@3.3.10
  - @prosopo/types@3.5.8
  - @prosopo/database@3.4.10
  - @prosopo/datasets@3.0.39
  - @prosopo/types-env@2.7.43
  - @prosopo/api@3.1.29
  - @prosopo/api-express-router@3.0.30
  - @prosopo/env@3.2.18
  - @prosopo/keyring@2.8.32
  - @prosopo/load-balancer@2.8.5
  - @prosopo/user-access-policy@3.5.24

## 3.12.10
### Patch Changes

- b8185a4: feat/uap-rules-syncer
- 3a027ef: Fix session storer
- 3a027ef: Release cycle
- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
- Updated dependencies [3a027ef]
- Updated dependencies [3a027ef]
  - @prosopo/user-access-policy@3.5.23
  - @prosopo/api@3.1.28
  - @prosopo/common@3.1.21
  - @prosopo/api-express-router@3.0.29
  - @prosopo/api-route@2.6.29
  - @prosopo/database@3.4.9
  - @prosopo/config@3.1.21
  - @prosopo/types-database@3.3.9
  - @prosopo/datasets@3.0.38
  - @prosopo/env@3.2.17
  - @prosopo/keyring@2.8.31
  - @prosopo/load-balancer@2.8.4
  - @prosopo/types-env@2.7.42
  - @prosopo/locale@3.1.21
  - @prosopo/types@3.5.7
  - @prosopo/util@3.1.6
  - @prosopo/util-crypto@13.5.23

## 3.12.9
### Patch Changes

- 8491159: Store webview

## 3.12.8
### Patch Changes

- 5d11a81: Adding maintenance mode
- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/api@3.1.27
  - @prosopo/api-express-router@3.0.28
  - @prosopo/database@3.4.8
  - @prosopo/datasets@3.0.37
  - @prosopo/env@3.2.16
  - @prosopo/keyring@2.8.30
  - @prosopo/load-balancer@2.8.3
  - @prosopo/types-database@3.3.8
  - @prosopo/types-env@2.7.41
  - @prosopo/user-access-policy@3.5.22

## 3.12.7
### Patch Changes

- cbc5d8e: Additional logging

## 3.12.6
### Patch Changes

- 494c5a8: Updated payload
- Updated dependencies [494c5a8]
  - @prosopo/types-database@3.3.7
  - @prosopo/types@3.5.5
  - @prosopo/database@3.4.7
  - @prosopo/datasets@3.0.36
  - @prosopo/types-env@2.7.40
  - @prosopo/api@3.1.26
  - @prosopo/api-express-router@3.0.27
  - @prosopo/env@3.2.15
  - @prosopo/keyring@2.8.29
  - @prosopo/load-balancer@2.8.2
  - @prosopo/user-access-policy@3.5.21

## 3.12.5
### Patch Changes

- 4ba029e: repo maintainance

## 3.12.4
### Patch Changes

- 08ff50f: Hot fix country code
- Updated dependencies [08ff50f]
- Updated dependencies [08ff50f]
  - @prosopo/types-database@3.3.6
  - @prosopo/types@3.5.4
  - @prosopo/database@3.4.6
  - @prosopo/datasets@3.0.35
  - @prosopo/types-env@2.7.39
  - @prosopo/api@3.1.25
  - @prosopo/api-express-router@3.0.26
  - @prosopo/env@3.2.14
  - @prosopo/keyring@2.8.28
  - @prosopo/load-balancer@2.8.1
  - @prosopo/user-access-policy@3.5.20

## 3.12.3
### Patch Changes

- 04d0f1a: weighted random provider selection
- Updated dependencies [04d0f1a]
- Updated dependencies [1e3a838]
  - @prosopo/load-balancer@2.8.0
  - @prosopo/config@3.1.20
  - @prosopo/api@3.1.24
  - @prosopo/api-express-router@3.0.25
  - @prosopo/api-route@2.6.28
  - @prosopo/common@3.1.20
  - @prosopo/database@3.4.5
  - @prosopo/datasets@3.0.34
  - @prosopo/env@3.2.13
  - @prosopo/keyring@2.8.27
  - @prosopo/locale@3.1.20
  - @prosopo/types@3.5.3
  - @prosopo/types-database@3.3.5
  - @prosopo/types-env@2.7.38
  - @prosopo/user-access-policy@3.5.19
  - @prosopo/util@3.1.5
  - @prosopo/util-crypto@13.5.22

## 3.12.2
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/api-express-router@3.0.24
  - @prosopo/user-access-policy@3.5.18
  - @prosopo/types-database@3.3.4
  - @prosopo/load-balancer@2.7.12
  - @prosopo/util-crypto@13.5.21
  - @prosopo/api-route@2.6.27
  - @prosopo/types-env@2.7.37
  - @prosopo/database@3.4.4
  - @prosopo/datasets@3.0.33
  - @prosopo/keyring@2.8.26
  - @prosopo/locale@3.1.19
  - @prosopo/types@3.5.2
  - @prosopo/util@3.1.4
  - @prosopo/api@3.1.23
  - @prosopo/env@3.2.12
  - @prosopo/config@3.1.19

## 3.12.1
### Patch Changes

- 52cd544: Integrity checks
- b8cc590: New injection methods
- b117ba3: Hot fix country code
- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [c72ecbd]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/database@3.4.3
  - @prosopo/api-express-router@3.0.23
  - @prosopo/user-access-policy@3.5.17
  - @prosopo/types-database@3.3.3
  - @prosopo/load-balancer@2.7.11
  - @prosopo/util-crypto@13.5.20
  - @prosopo/api-route@2.6.26
  - @prosopo/types-env@2.7.36
  - @prosopo/datasets@3.0.32
  - @prosopo/keyring@2.8.25
  - @prosopo/common@3.1.18
  - @prosopo/locale@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/api@3.1.22
  - @prosopo/env@3.2.11
  - @prosopo/config@3.1.18

## 3.12.0
### Minor Changes

- e20ad6b: IP country overrides

### Patch Changes

- 618703f: Release 3.4.2
- cf6c8a4: Hot fix the request logger
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/api-express-router@3.0.22
  - @prosopo/user-access-policy@3.5.16
  - @prosopo/types-database@3.3.2
  - @prosopo/load-balancer@2.7.10
  - @prosopo/util-crypto@13.5.19
  - @prosopo/api-route@2.6.25
  - @prosopo/types-env@2.7.35
  - @prosopo/database@3.4.2
  - @prosopo/datasets@3.0.31
  - @prosopo/keyring@2.8.24
  - @prosopo/common@3.1.17
  - @prosopo/locale@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/util@3.1.2
  - @prosopo/api@3.1.21
  - @prosopo/env@3.2.10
  - @prosopo/config@3.1.17

## 3.11.1
### Patch Changes

- 7e5613a: Always store image rounds count
- 11303d9: feat/pluggable-redis
- b6794f8: Timestamp decay fn
- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [b6794f8]
- Updated dependencies [11303d9]
- Updated dependencies [bac2d91]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/user-access-policy@3.5.15
  - @prosopo/database@3.4.1
  - @prosopo/types-database@3.3.1
  - @prosopo/api-express-router@3.0.21
  - @prosopo/load-balancer@2.7.9
  - @prosopo/util-crypto@13.5.18
  - @prosopo/api-route@2.6.24
  - @prosopo/types-env@2.7.34
  - @prosopo/datasets@3.0.30
  - @prosopo/keyring@2.8.23
  - @prosopo/common@3.1.16
  - @prosopo/locale@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/util@3.1.1
  - @prosopo/api@3.1.20
  - @prosopo/env@3.2.9
  - @prosopo/config@3.1.16

## 3.11.0
### Minor Changes

- 6768f14: Update salt

### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/api-express-router@3.0.20
  - @prosopo/user-access-policy@3.5.14
  - @prosopo/types-database@3.3.0
  - @prosopo/load-balancer@2.7.8
  - @prosopo/util-crypto@13.5.17
  - @prosopo/api-route@2.6.23
  - @prosopo/types-env@2.7.33
  - @prosopo/database@3.4.0
  - @prosopo/datasets@3.0.29
  - @prosopo/keyring@2.8.22
  - @prosopo/common@3.1.15
  - @prosopo/locale@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/util@3.1.0
  - @prosopo/api@3.1.19
  - @prosopo/env@3.2.8
  - @prosopo/config@3.1.15

## 3.10.0
### Minor Changes

- 97edf3f: Adding dom manip checks

### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/api-express-router@3.0.19
  - @prosopo/user-access-policy@3.5.13
  - @prosopo/types-database@3.2.2
  - @prosopo/load-balancer@2.7.7
  - @prosopo/util-crypto@13.5.16
  - @prosopo/api-route@2.6.22
  - @prosopo/types-env@2.7.32
  - @prosopo/database@3.3.2
  - @prosopo/datasets@3.0.28
  - @prosopo/keyring@2.8.21
  - @prosopo/common@3.1.14
  - @prosopo/locale@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/api@3.1.18
  - @prosopo/env@3.2.7
  - @prosopo/config@3.1.14

## 3.9.1
### Patch Changes

- 5137f01: Update pow record at verify
- bebb855: ip parsing
- 509be28: Fix IP conditions logic
- 509be28: Fix require all conditions logic
- 008d112: Release 3.3.0
- Updated dependencies [5137f01]
- Updated dependencies [0555cd8]
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types-database@3.2.1
  - @prosopo/database@3.3.1
  - @prosopo/types@3.2.1
  - @prosopo/api-express-router@3.0.18
  - @prosopo/user-access-policy@3.5.12
  - @prosopo/load-balancer@2.7.6
  - @prosopo/util-crypto@13.5.15
  - @prosopo/api-route@2.6.21
  - @prosopo/types-env@2.7.31
  - @prosopo/datasets@3.0.27
  - @prosopo/keyring@2.8.20
  - @prosopo/common@3.1.13
  - @prosopo/locale@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/api@3.1.17
  - @prosopo/env@3.2.6
  - @prosopo/config@3.1.13

## 3.9.0
### Minor Changes

- cf48565: Store additional details. Remove duplicate indexes.
- 260de39: Fix indexes so that stuff properly expires

### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [d644c04]
- Updated dependencies [0824221]
- Updated dependencies [260de39]
  - @prosopo/types-database@3.2.0
  - @prosopo/database@3.3.0
  - @prosopo/types@3.2.0
  - @prosopo/api-express-router@3.0.17
  - @prosopo/user-access-policy@3.5.11
  - @prosopo/load-balancer@2.7.5
  - @prosopo/util-crypto@13.5.14
  - @prosopo/api-route@2.6.20
  - @prosopo/types-env@2.7.30
  - @prosopo/datasets@3.0.26
  - @prosopo/keyring@2.8.19
  - @prosopo/common@3.1.12
  - @prosopo/locale@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/api@3.1.16
  - @prosopo/env@3.2.5
  - @prosopo/config@3.1.12

## 3.8.4
### Patch Changes

- 0d1a33e: Adding ipcomparison service with user features
- 0d1a33e: Adding ip comparison service
- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/types-database@3.1.5
  - @prosopo/locale@3.1.11
  - @prosopo/types@3.1.4
  - @prosopo/api-express-router@3.0.16
  - @prosopo/user-access-policy@3.5.10
  - @prosopo/load-balancer@2.7.4
  - @prosopo/util-crypto@13.5.13
  - @prosopo/api-route@2.6.19
  - @prosopo/types-env@2.7.29
  - @prosopo/database@3.2.4
  - @prosopo/datasets@3.0.25
  - @prosopo/keyring@2.8.18
  - @prosopo/common@3.1.11
  - @prosopo/util@3.0.14
  - @prosopo/api@3.1.15
  - @prosopo/env@3.2.4
  - @prosopo/config@3.1.11

## 3.8.3
### Patch Changes

- 36b23e0: Fix entropy. Fix api call. Persist ja4 through logs.
- 657a827: Release 3.2.2
- 4aac849: Do not error when IPs don't match
- Updated dependencies [36b23e0]
- Updated dependencies [a8a9251]
- Updated dependencies [657a827]
  - @prosopo/api@3.1.14
  - @prosopo/types-database@3.1.4
  - @prosopo/api-express-router@3.0.15
  - @prosopo/user-access-policy@3.5.9
  - @prosopo/load-balancer@2.7.3
  - @prosopo/util-crypto@13.5.12
  - @prosopo/api-route@2.6.18
  - @prosopo/types-env@2.7.28
  - @prosopo/database@3.2.3
  - @prosopo/datasets@3.0.24
  - @prosopo/keyring@2.8.17
  - @prosopo/common@3.1.10
  - @prosopo/locale@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/util@3.0.13
  - @prosopo/env@3.2.3
  - @prosopo/config@3.1.10

## 3.8.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- 1249ce0: Be more lenient with random provider selection
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/api-express-router@3.0.14
  - @prosopo/user-access-policy@3.5.8
  - @prosopo/types-database@3.1.3
  - @prosopo/load-balancer@2.7.2
  - @prosopo/util-crypto@13.5.11
  - @prosopo/api-route@2.6.17
  - @prosopo/types-env@2.7.27
  - @prosopo/database@3.2.2
  - @prosopo/datasets@3.0.23
  - @prosopo/keyring@2.8.16
  - @prosopo/common@3.1.9
  - @prosopo/locale@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/util@3.0.12
  - @prosopo/api@3.1.13
  - @prosopo/env@3.2.2
  - @prosopo/config@3.1.9

## 3.8.1
### Patch Changes

- 1f980c4: Fix types mismatch in decryption
- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/load-balancer@2.7.1
  - @prosopo/types@3.1.1
  - @prosopo/api-express-router@3.0.13
  - @prosopo/user-access-policy@3.5.7
  - @prosopo/types-database@3.1.2
  - @prosopo/util-crypto@13.5.10
  - @prosopo/api-route@2.6.16
  - @prosopo/types-env@2.7.26
  - @prosopo/database@3.2.1
  - @prosopo/datasets@3.0.22
  - @prosopo/keyring@2.8.15
  - @prosopo/common@3.1.8
  - @prosopo/locale@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/api@3.1.12
  - @prosopo/env@3.2.1
  - @prosopo/config@3.1.8

## 3.8.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/api-express-router@3.0.12
  - @prosopo/user-access-policy@3.5.6
  - @prosopo/types-database@3.1.1
  - @prosopo/load-balancer@2.7.0
  - @prosopo/util-crypto@13.5.9
  - @prosopo/api-route@2.6.15
  - @prosopo/types-env@2.7.25
  - @prosopo/database@3.2.0
  - @prosopo/datasets@3.0.21
  - @prosopo/keyring@2.8.14
  - @prosopo/common@3.1.7
  - @prosopo/locale@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/util@3.0.10
  - @prosopo/api@3.1.11
  - @prosopo/env@3.2.0
  - @prosopo/config@3.1.7

## 3.7.0
### Minor Changes

- 9b92339: fix/ipv6-in-captcha-flow

### Patch Changes

- a07db04: Release 3.1.12
- ebb0168: Allowing for simple pattern matching with domains
- Updated dependencies [9b92339]
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
- Updated dependencies [ebb0168]
  - @prosopo/types-database@3.1.0
  - @prosopo/database@3.1.0
  - @prosopo/datasets@3.0.20
  - @prosopo/config@3.1.6
  - @prosopo/api-express-router@3.0.11
  - @prosopo/user-access-policy@3.5.5
  - @prosopo/types-env@2.7.24
  - @prosopo/api@3.1.10
  - @prosopo/env@3.1.11
  - @prosopo/util@3.0.9
  - @prosopo/api-route@2.6.14
  - @prosopo/common@3.1.6
  - @prosopo/keyring@2.8.13
  - @prosopo/load-balancer@2.6.21
  - @prosopo/locale@3.1.6
  - @prosopo/types@3.0.10
  - @prosopo/util-crypto@13.5.8

## 3.6.2
### Patch Changes

- Updated dependencies [e64160c]
- Updated dependencies [553025d]
  - @prosopo/database@3.0.19
  - @prosopo/user-access-policy@3.5.4
  - @prosopo/env@3.1.10
  - @prosopo/api@3.1.9
  - @prosopo/types-database@3.0.19
  - @prosopo/api-express-router@3.0.10
  - @prosopo/datasets@3.0.19
  - @prosopo/types-env@2.7.23

## 3.6.1
### Patch Changes

- d8e855c: Adding checks for IP consistency throughout the verification process
- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/types-database@3.0.18
  - @prosopo/locale@3.1.5
  - @prosopo/api-express-router@3.0.9
  - @prosopo/user-access-policy@3.5.3
  - @prosopo/load-balancer@2.6.20
  - @prosopo/util-crypto@13.5.7
  - @prosopo/api-route@2.6.13
  - @prosopo/types-env@2.7.22
  - @prosopo/database@3.0.18
  - @prosopo/datasets@3.0.18
  - @prosopo/keyring@2.8.12
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9
  - @prosopo/util@3.0.8
  - @prosopo/api@3.1.8
  - @prosopo/env@3.1.9

## 3.6.0
### Minor Changes

- dc5ce11: Use out of the box JA4 impl

### Patch Changes

- 6b98f67: Fix recency checker
- Updated dependencies [30e7d4d]
  - @prosopo/datasets@3.0.17
  - @prosopo/config@3.1.5
  - @prosopo/api-express-router@3.0.8
  - @prosopo/api-route@2.6.12
  - @prosopo/common@3.1.4
  - @prosopo/database@3.0.17
  - @prosopo/env@3.1.8
  - @prosopo/keyring@2.8.11
  - @prosopo/load-balancer@2.6.19
  - @prosopo/types@3.0.8
  - @prosopo/types-database@3.0.17
  - @prosopo/types-env@2.7.21
  - @prosopo/user-access-policy@3.5.2
  - @prosopo/util@3.0.7
  - @prosopo/util-crypto@13.5.6

## 3.5.0
### Minor Changes

- 3834a10: Proper session validation

### Patch Changes

- 0c865a7: Add missing var
- 1f3a02f: Release 3.1.8
- Updated dependencies [1f3a02f]
  - @prosopo/user-access-policy@3.5.1
  - @prosopo/types-database@3.0.16
  - @prosopo/types-env@2.7.20
  - @prosopo/database@3.0.16
  - @prosopo/datasets@3.0.16
  - @prosopo/env@3.1.7

## 3.4.0
### Minor Changes

- e0628d9: Make sure rules don't leak between IPs

### Patch Changes

- 8cc6551: x
- Updated dependencies [926df8a]
- Updated dependencies [e0628d9]
  - @prosopo/datasets@3.0.15
  - @prosopo/user-access-policy@3.5.0
  - @prosopo/database@3.0.15
  - @prosopo/types-database@3.0.15
  - @prosopo/env@3.1.6
  - @prosopo/types-env@2.7.19

## 3.3.1
### Patch Changes

- a49b538: Extra tests
- e090e2f: More tests
- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
- Updated dependencies [e090e2f]
  - @prosopo/config@3.1.4
  - @prosopo/user-access-policy@3.4.1
  - @prosopo/common@3.1.3
  - @prosopo/api-express-router@3.0.7
  - @prosopo/api-route@2.6.11
  - @prosopo/database@3.0.14
  - @prosopo/datasets@3.0.14
  - @prosopo/env@3.1.5
  - @prosopo/keyring@2.8.10
  - @prosopo/types@3.0.7
  - @prosopo/types-database@3.0.14
  - @prosopo/types-env@2.7.18
  - @prosopo/util@3.0.6
  - @prosopo/util-crypto@13.5.5

## 3.3.0
### Minor Changes

- df4e030: Revising UAP rule getters

### Patch Changes

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
  - @prosopo/types-database@3.0.13
  - @prosopo/api-route@2.6.10
  - @prosopo/types-env@2.7.17
  - @prosopo/database@3.0.13
  - @prosopo/common@3.1.2
  - @prosopo/types@3.0.6
  - @prosopo/env@3.1.4
  - @prosopo/config@3.1.3
  - @prosopo/user-access-policy@3.4.0
  - @prosopo/api-express-router@3.0.6
  - @prosopo/util-crypto@13.5.4
  - @prosopo/datasets@3.0.13
  - @prosopo/keyring@2.8.9
  - @prosopo/util@3.0.5

## 3.2.5
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/api-express-router@3.0.5
  - @prosopo/user-access-policy@3.3.2
  - @prosopo/types-database@3.0.12
  - @prosopo/util-crypto@13.5.3
  - @prosopo/api-route@2.6.9
  - @prosopo/types-env@2.7.16
  - @prosopo/database@3.0.12
  - @prosopo/datasets@3.0.12
  - @prosopo/keyring@2.8.8
  - @prosopo/common@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/util@3.0.4
  - @prosopo/env@3.1.3
  - @prosopo/config@3.1.2

## 3.2.4
### Patch Changes

- Updated dependencies [625fef8]
  - @prosopo/types-database@3.0.11
  - @prosopo/database@3.0.11
  - @prosopo/datasets@3.0.11
  - @prosopo/env@3.1.2
  - @prosopo/types-env@2.7.15

## 3.2.3
### Patch Changes

- 58ab0ce: logging key fix

## 3.2.2
### Patch Changes

- 9e4e7ca: better key logging

## 3.2.1
### Patch Changes

- 2f0c830: Remove node-fetch
- 52dbf21: bumping deps
- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 63519d7: Tests
- f29fc7e: Refining API error handling. Adding more language strings
- 3573f0b: standardise all vite based npm scripts for bundling
- 2d0dd8a: Integration tests for UAPs
- Updated dependencies [52dbf21]
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [8a64429]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
- Updated dependencies [6d604ad]
  - @prosopo/util@3.0.3
  - @prosopo/util-crypto@13.5.2
  - @prosopo/types-env@2.7.14
  - @prosopo/keyring@2.8.7
  - @prosopo/types@3.0.4
  - @prosopo/api-express-router@3.0.4
  - @prosopo/user-access-policy@3.3.1
  - @prosopo/types-database@3.0.10
  - @prosopo/api-route@2.6.8
  - @prosopo/database@3.0.10
  - @prosopo/datasets@3.0.10
  - @prosopo/common@3.1.0
  - @prosopo/env@3.1.1
  - @prosopo/config@3.1.1

## 3.2.0
### Minor Changes

- b7c3258: Add tests for UAPs

### Patch Changes

- Updated dependencies [b7c3258]
  - @prosopo/user-access-policy@3.3.0
  - @prosopo/env@3.1.0
  - @prosopo/database@3.0.9
  - @prosopo/types-database@3.0.9
  - @prosopo/datasets@3.0.9
  - @prosopo/types-env@2.7.13

## 3.1.3
### Patch Changes

- Updated dependencies [cdf7c29]
  - @prosopo/user-access-policy@3.2.1
  - @prosopo/database@3.0.8
  - @prosopo/types-database@3.0.8
  - @prosopo/env@3.0.8
  - @prosopo/datasets@3.0.8
  - @prosopo/types-env@2.7.12

## 3.1.2
### Patch Changes

- Updated dependencies [a7164ce]
  - @prosopo/user-access-policy@3.2.0
  - @prosopo/database@3.0.7
  - @prosopo/types-database@3.0.7
  - @prosopo/env@3.0.7
  - @prosopo/datasets@3.0.7
  - @prosopo/types-env@2.7.11

## 3.1.1
### Patch Changes

- b0d7207: Types for proper rotation
- Updated dependencies [b0d7207]
  - @prosopo/types-database@3.0.6
  - @prosopo/database@3.0.6
  - @prosopo/types@3.0.3
  - @prosopo/datasets@3.0.6
  - @prosopo/env@3.0.6
  - @prosopo/types-env@2.7.10
  - @prosopo/keyring@2.8.6
  - @prosopo/user-access-policy@3.1.5

## 3.1.0
### Minor Changes

- 9e18fca: Make resolver easier to use

## 3.0.6
### Patch Changes

- 9671152: uuid
- Updated dependencies [9671152]
  - @prosopo/api-express-router@3.0.3

## 3.0.5
### Patch Changes

- Updated dependencies [745cc89]
  - @prosopo/config@3.1.0
  - @prosopo/database@3.0.5
  - @prosopo/datasets@3.0.5
  - @prosopo/env@3.0.5
  - @prosopo/types-database@3.0.5
  - @prosopo/types-env@2.7.9
  - @prosopo/util@3.0.2
  - @prosopo/user-access-policy@3.1.4

## 3.0.4
### Patch Changes

- Updated dependencies [5619b4b]
  - @prosopo/config@3.0.1
  - @prosopo/database@3.0.4
  - @prosopo/datasets@3.0.4
  - @prosopo/env@3.0.4
  - @prosopo/types-database@3.0.4
  - @prosopo/types-env@2.7.8
  - @prosopo/util@3.0.1
  - @prosopo/user-access-policy@3.1.3

## 3.0.3
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/types-database@3.0.3
  - @prosopo/database@3.0.3
  - @prosopo/types@3.0.2
  - @prosopo/datasets@3.0.3
  - @prosopo/env@3.0.3
  - @prosopo/types-env@2.7.7
  - @prosopo/common@3.0.2
  - @prosopo/keyring@2.8.5
  - @prosopo/user-access-policy@3.1.2
  - @prosopo/api-express-router@3.0.2
  - @prosopo/api-route@2.6.7

## 3.0.2
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/api-express-router@3.0.1
  - @prosopo/api-route@2.6.6
  - @prosopo/database@3.0.2
  - @prosopo/datasets@3.0.2
  - @prosopo/env@3.0.2
  - @prosopo/keyring@2.8.4
  - @prosopo/types-database@3.0.2
  - @prosopo/types-env@2.7.6
  - @prosopo/user-access-policy@3.1.1

## 3.0.1
### Patch Changes

- Updated dependencies [913f2a6]
  - @prosopo/user-access-policy@3.1.0
  - @prosopo/types-database@3.0.1
  - @prosopo/database@3.0.1
  - @prosopo/datasets@3.0.1
  - @prosopo/env@3.0.1
  - @prosopo/types-env@2.7.5

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/api-express-router@3.0.0
  - @prosopo/user-access-policy@3.0.0
  - @prosopo/types-database@3.0.0
  - @prosopo/database@3.0.0
  - @prosopo/datasets@3.0.0
  - @prosopo/common@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/util@3.0.0
  - @prosopo/env@3.0.0
  - @prosopo/config@3.0.0
  - @prosopo/types-env@2.7.4
  - @prosopo/api-route@2.6.5
  - @prosopo/keyring@2.8.3

## 2.14.0
### Minor Changes

- aee3efe: Add healthz endpoint

### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0
  - @prosopo/database@2.6.9
  - @prosopo/datasets@2.7.3
  - @prosopo/env@2.7.3
  - @prosopo/keyring@2.8.2
  - @prosopo/types-database@2.7.6
  - @prosopo/types-env@2.7.3
  - @prosopo/user-access-policy@2.6.8

## 2.13.0
### Minor Changes

- d5f2e95: Fix ip checking logic

## 2.12.1
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/api-express-router@2.6.4
  - @prosopo/user-access-policy@2.6.7
  - @prosopo/types-database@2.7.5
  - @prosopo/util-crypto@13.5.1
  - @prosopo/api-route@2.6.4
  - @prosopo/types-env@2.7.2
  - @prosopo/database@2.6.8
  - @prosopo/datasets@2.7.2
  - @prosopo/keyring@2.8.1
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1
  - @prosopo/env@2.7.2
  - @prosopo/config@2.6.1
  - @prosopo/util@2.6.1

## 2.12.0
### Minor Changes

- d6de900: ip pass through

## 2.11.0
### Minor Changes

- 30bb383: Making sure verify works and derived accounts

### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/util-crypto@13.5.0
  - @prosopo/keyring@2.8.0
  - @prosopo/types@2.9.0
  - @prosopo/common@2.7.1
  - @prosopo/datasets@2.7.1
  - @prosopo/database@2.6.7
  - @prosopo/env@2.7.1
  - @prosopo/types-database@2.7.4
  - @prosopo/types-env@2.7.1
  - @prosopo/user-access-policy@2.6.6
  - @prosopo/api-express-router@2.6.3
  - @prosopo/api-route@2.6.3

## 2.10.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/util-crypto@13.4.0
  - @prosopo/types-env@2.7.0
  - @prosopo/datasets@2.7.0
  - @prosopo/keyring@2.7.0
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/env@2.7.0
  - @prosopo/api-express-router@2.6.2
  - @prosopo/api-route@2.6.2
  - @prosopo/database@2.6.6
  - @prosopo/types-database@2.7.3
  - @prosopo/user-access-policy@2.6.5

## 2.9.8

### Patch Changes

- Updated dependencies [ea38a1c]
  - @prosopo/datasets@2.6.12

## 2.9.7

### Patch Changes

- Updated dependencies [b2ae723]
  - @prosopo/datasets@2.6.11

## 2.9.6

### Patch Changes

- Updated dependencies [d17c67f]
  - @prosopo/datasets@2.6.10

## 2.9.5

### Patch Changes

- Updated dependencies [0d194f2]
  - @prosopo/datasets@2.6.9

## 2.9.4

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/api-express-router@2.6.1
  - @prosopo/api-route@2.6.1
  - @prosopo/database@2.6.5
  - @prosopo/datasets@2.6.8
  - @prosopo/env@2.6.5
  - @prosopo/keyring@2.6.4
  - @prosopo/types@2.7.1
  - @prosopo/types-database@2.7.2
  - @prosopo/types-env@2.6.5
  - @prosopo/user-access-policy@2.6.4

## 2.9.3

### Patch Changes

- Updated dependencies [bc892fa]
  - @prosopo/datasets@2.6.7

## 2.9.2

### Patch Changes

- Updated dependencies [84fc39f]
  - @prosopo/datasets@2.6.6

## 2.9.1

### Patch Changes

- 5656b0c: Adding cypress tests for invisible
- 5656b0c: Adding all client examples to bundle example
- Updated dependencies [5656b0c]
- Updated dependencies [5656b0c]
  - @prosopo/datasets@2.6.5

## 2.9.0

### Minor Changes

- 6e1aef6: Add IP check when verifying

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0
  - @prosopo/database@2.6.4
  - @prosopo/datasets@2.6.4
  - @prosopo/env@2.6.4
  - @prosopo/keyring@2.6.3
  - @prosopo/types-database@2.7.1
  - @prosopo/types-env@2.6.4
  - @prosopo/user-access-policy@2.6.3

## 2.8.0

### Minor Changes

- cf59998: Update DB schema

### Patch Changes

- Updated dependencies [cf59998]
  - @prosopo/types-database@2.7.0
  - @prosopo/database@2.6.3
  - @prosopo/datasets@2.6.3
  - @prosopo/env@2.6.3
  - @prosopo/types-env@2.6.3

## 2.7.1

### Patch Changes

- Updated dependencies [6ff193a]
  - @prosopo/datasets@2.6.2
  - @prosopo/types@2.6.2
  - @prosopo/database@2.6.2
  - @prosopo/env@2.6.2
  - @prosopo/keyring@2.6.2
  - @prosopo/types-database@2.6.2
  - @prosopo/types-env@2.6.2
  - @prosopo/user-access-policy@2.6.2

## 2.7.0

### Minor Changes

- 39a9826: Updated JA4 extension hash generator

### Patch Changes

- 52feffc: Adjustable difficulty img captcha
- Updated dependencies [52feffc]
  - @prosopo/types-database@2.6.1
  - @prosopo/database@2.6.1
  - @prosopo/datasets@2.6.1
  - @prosopo/types@2.6.1
  - @prosopo/env@2.6.1
  - @prosopo/types-env@2.6.1
  - @prosopo/keyring@2.6.1
  - @prosopo/user-access-policy@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/config@2.6.0
  - @prosopo/api-express-router@2.6.0
  - @prosopo/api-route@2.6.0
  - @prosopo/common@2.6.0
  - @prosopo/database@2.6.0
  - @prosopo/datasets@2.6.0
  - @prosopo/env@2.6.0
  - @prosopo/keyring@2.6.0
  - @prosopo/types@2.6.0
  - @prosopo/types-database@2.6.0
  - @prosopo/types-env@2.6.0
  - @prosopo/user-access-policy@2.6.0
  - @prosopo/util@2.6.0
