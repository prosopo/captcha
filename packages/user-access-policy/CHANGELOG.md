# @prosopo/user-access-policy

## 3.6.7
### Patch Changes

- Updated dependencies [ad6d622]
  - @prosopo/types@3.10.0
  - @prosopo/api@3.1.47

## 3.6.6
### Patch Changes

- Updated dependencies [ff58a70]
  - @prosopo/types@3.9.0
  - @prosopo/api@3.1.46

## 3.6.5
### Patch Changes

- Updated dependencies [d2431cd]
  - @prosopo/types@3.8.4
  - @prosopo/api@3.1.45

## 3.6.4
### Patch Changes

- bd6995b: Adding UAP based geoblocking rules
- Updated dependencies [bd6995b]
  - @prosopo/types@3.8.3
  - @prosopo/api@3.1.44

## 3.6.3
### Patch Changes

- Updated dependencies [9633e58]
  - @prosopo/types@3.8.2
  - @prosopo/api@3.1.43

## 3.6.2
### Patch Changes

- Updated dependencies [f52a5c1]
  - @prosopo/types@3.8.1
  - @prosopo/api@3.1.42

## 3.6.1
### Patch Changes

- ed87b6f: Fix authentication in uaps

## 3.6.0
### Minor Changes

- 17854a7: fix deleteAll endpoint throwing a recursion limit when too many rules are in redis

### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 3acc333: Release 3.3.0
- Updated dependencies [a53526b]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [7543d17]
- Updated dependencies [3acc333]
  - @prosopo/util@3.2.5
  - @prosopo/types@3.8.0
  - @prosopo/redis-client@1.0.13
  - @prosopo/api-route@2.6.36
  - @prosopo/common@3.1.28
  - @prosopo/api@3.1.41

## 3.5.37
### Patch Changes

- 378a896: Fix: Remove captchaType and solvedImagesCount from block access policies. Block policies should not store these fields as they are only relevant for restrict policies that present captcha challenges.
- 90fddd8: Fix UAP expiry timestamp handling: missing propagation and unit conversion. Timestamps are now correctly propagated when policyScopes are present, and milliseconds are properly converted to seconds for Redis expireAt.

## 3.5.36
### Patch Changes

- 7c475dc: Add headHash and coords fields to user access policies, and implement user access policy checks in server-side PoW verification

## 3.5.35
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/api@3.1.40

## 3.5.34
### Patch Changes

- Updated dependencies [345b25b]
  - @prosopo/types@3.7.1
  - @prosopo/api@3.1.39

## 3.5.33
### Patch Changes

- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
  - @prosopo/types@3.7.0
  - @prosopo/api@3.1.38
  - @prosopo/common@3.1.27
  - @prosopo/api-route@2.6.35
  - @prosopo/redis-client@1.0.12

## 3.5.32
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/api@3.1.37
  - @prosopo/api-route@2.6.34
  - @prosopo/common@3.1.26
  - @prosopo/redis-client@1.0.11
  - @prosopo/types@3.6.4
  - @prosopo/util@3.2.4

## 3.5.31
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/api@3.1.36
  - @prosopo/api-route@2.6.33
  - @prosopo/common@3.1.25
  - @prosopo/redis-client@1.0.10
  - @prosopo/types@3.6.3
  - @prosopo/util@3.2.3

## 3.5.30
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/redis-client@1.0.9
  - @prosopo/api-route@2.6.32
  - @prosopo/common@3.1.24
  - @prosopo/types@3.6.2
  - @prosopo/util@3.2.2
  - @prosopo/api@3.1.35

## 3.5.29
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/api@3.1.34
  - @prosopo/api-route@2.6.31
  - @prosopo/common@3.1.23
  - @prosopo/redis-client@1.0.8
  - @prosopo/types@3.6.1
  - @prosopo/util@3.2.1

## 3.5.28
### Patch Changes

- 8ce9205: enhance/uap-rules-push
- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [b6e98b2]
  - @prosopo/types@3.6.0
  - @prosopo/util@3.2.0
  - @prosopo/redis-client@1.0.7
  - @prosopo/api-route@2.6.30
  - @prosopo/common@3.1.22
  - @prosopo/api@3.1.33

## 3.5.27
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/api@3.1.32

## 3.5.26
### Patch Changes

- Updated dependencies [cb8ab85]
  - @prosopo/types@3.5.10
  - @prosopo/api@3.1.31

## 3.5.25
### Patch Changes

- 005ce66: Split load balancer into URL fn and getter fn for private repo
- Updated dependencies [43907e8]
- Updated dependencies [005ce66]
- Updated dependencies [7101036]
  - @prosopo/types@3.5.9
  - @prosopo/util@3.1.7
  - @prosopo/api@3.1.30

## 3.5.24
### Patch Changes

- Updated dependencies [e5c259d]
  - @prosopo/types@3.5.8
  - @prosopo/api@3.1.29

## 3.5.23
### Patch Changes

- c9d8fdf: feat/access-policy-group
- b8185a4: feat/uap-rules-syncer
- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
  - @prosopo/api@3.1.28
  - @prosopo/common@3.1.21
  - @prosopo/api-route@2.6.29
  - @prosopo/redis-client@1.0.6
  - @prosopo/types@3.5.7
  - @prosopo/util@3.1.6

## 3.5.22
### Patch Changes

- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/api@3.1.27

## 3.5.21
### Patch Changes

- Updated dependencies [494c5a8]
  - @prosopo/types@3.5.5
  - @prosopo/api@3.1.26

## 3.5.20
### Patch Changes

- Updated dependencies [08ff50f]
  - @prosopo/types@3.5.4
  - @prosopo/api@3.1.25

## 3.5.19
### Patch Changes

  - @prosopo/api@3.1.24
  - @prosopo/api-route@2.6.28
  - @prosopo/common@3.1.20
  - @prosopo/redis-client@1.0.5
  - @prosopo/types@3.5.3
  - @prosopo/util@3.1.5

## 3.5.18
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/redis-client@1.0.4
  - @prosopo/api-route@2.6.27
  - @prosopo/types@3.5.2
  - @prosopo/util@3.1.4
  - @prosopo/api@3.1.23

## 3.5.17
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/redis-client@1.0.3
  - @prosopo/api-route@2.6.26
  - @prosopo/common@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/api@3.1.22

## 3.5.16
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/redis-client@1.0.2
  - @prosopo/api-route@2.6.25
  - @prosopo/common@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/util@3.1.2
  - @prosopo/api@3.1.21

## 3.5.15
### Patch Changes

- 11303d9: feat/pluggable-redis
- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/redis-client@1.0.1
  - @prosopo/api-route@2.6.24
  - @prosopo/common@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/util@3.1.1
  - @prosopo/api@3.1.20

## 3.5.14
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/api-route@2.6.23
  - @prosopo/common@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/util@3.1.0
  - @prosopo/config@3.1.15

## 3.5.13
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/api-route@2.6.22
  - @prosopo/common@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/config@3.1.14

## 3.5.12
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types@3.2.1
  - @prosopo/api-route@2.6.21
  - @prosopo/common@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/config@3.1.13

## 3.5.11
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [0824221]
  - @prosopo/types@3.2.0
  - @prosopo/api-route@2.6.20
  - @prosopo/common@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/config@3.1.12

## 3.5.10
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/types@3.1.4
  - @prosopo/api-route@2.6.19
  - @prosopo/common@3.1.11
  - @prosopo/util@3.0.14
  - @prosopo/config@3.1.11

## 3.5.9
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/api-route@2.6.18
  - @prosopo/common@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/util@3.0.13
  - @prosopo/config@3.1.10

## 3.5.8
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/api-route@2.6.17
  - @prosopo/common@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/util@3.0.12
  - @prosopo/config@3.1.9

## 3.5.7
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/types@3.1.1
  - @prosopo/api-route@2.6.16
  - @prosopo/common@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/config@3.1.8

## 3.5.6
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/api-route@2.6.15
  - @prosopo/common@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/util@3.0.10
  - @prosopo/config@3.1.7

## 3.5.5
### Patch Changes

- a07db04: Release 3.1.12
- Updated dependencies [9eed772]
- Updated dependencies [ebb0168]
  - @prosopo/config@3.1.6
  - @prosopo/util@3.0.9
  - @prosopo/api-route@2.6.14
  - @prosopo/common@3.1.6
  - @prosopo/types@3.0.10

## 3.5.4
### Patch Changes

- 553025d: Index

## 3.5.3
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [6960643]
  - @prosopo/api-route@2.6.13
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9
  - @prosopo/util@3.0.8

## 3.5.2
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/api-route@2.6.12
  - @prosopo/common@3.1.4
  - @prosopo/types@3.0.8
  - @prosopo/util@3.0.7

## 3.5.1
### Patch Changes

- 1f3a02f: Release 3.1.8

## 3.5.0
### Minor Changes

- e0628d9: Make sure rules don't leak between IPs

## 3.4.1
### Patch Changes

- a49b538: Extra tests
- e090e2f: More tests
- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/api-route@2.6.11
  - @prosopo/types@3.0.7
  - @prosopo/util@3.0.6

## 3.4.0
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
  - @prosopo/api-route@2.6.10
  - @prosopo/common@3.1.2
  - @prosopo/types@3.0.6
  - @prosopo/config@3.1.3
  - @prosopo/util@3.0.5

## 3.3.2
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/api-route@2.6.9
  - @prosopo/common@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/util@3.0.4
  - @prosopo/config@3.1.2

## 3.3.1
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [52dbf21]
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/util@3.0.3
  - @prosopo/types@3.0.4
  - @prosopo/api-route@2.6.8
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.3.0
### Minor Changes

- b7c3258: Add tests for UAPs

## 3.2.1
### Patch Changes

- cdf7c29: Fix var

## 3.2.0
### Minor Changes

- a7164ce: Allow searching for more rules to make deleting rules easier. Fix the expiry times of rules

## 3.1.5
### Patch Changes

- Updated dependencies [b0d7207]
  - @prosopo/types@3.0.3

## 3.1.4
### Patch Changes

  - @prosopo/util@3.0.2

## 3.1.3
### Patch Changes

  - @prosopo/util@3.0.1

## 3.1.2
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/types@3.0.2
  - @prosopo/common@3.0.2
  - @prosopo/api-route@2.6.7

## 3.1.1
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/api-route@2.6.6

## 3.1.0
### Minor Changes

- 913f2a6: Make custom expiration times work in redis. Make redis internal only and persist data

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/util@3.0.0
  - @prosopo/api-route@2.6.5

## 2.6.8
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0

## 2.6.7
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/api-route@2.6.4
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1

## 2.6.6
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/types@2.9.0
  - @prosopo/common@2.7.1
  - @prosopo/api-route@2.6.3

## 2.6.5
### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/api-route@2.6.2

## 2.6.4

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/api-route@2.6.1
  - @prosopo/types@2.7.1

## 2.6.3

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0

## 2.6.2

### Patch Changes

- Updated dependencies [6ff193a]
  - @prosopo/types@2.6.2

## 2.6.1

### Patch Changes

- Updated dependencies [52feffc]
  - @prosopo/types@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/api-route@2.6.0
  - @prosopo/common@2.6.0
  - @prosopo/types@2.6.0
