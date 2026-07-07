# @prosopo/api-express-router

## 3.1.38
### Patch Changes

- Updated dependencies [de12b31]
- Updated dependencies [770954b]
  - @prosopo/types@4.9.4
  - @prosopo/env@3.6.7

## 3.1.37
### Patch Changes

- Updated dependencies [18d0287]
  - @prosopo/types@4.9.3
  - @prosopo/env@3.6.6

## 3.1.36
### Patch Changes

  - @prosopo/env@3.6.5

## 3.1.35
### Patch Changes

- Updated dependencies [f9e8c94]
- Updated dependencies [7a434e0]
  - @prosopo/locale@3.2.6
  - @prosopo/types@4.9.2
  - @prosopo/common@3.1.43
  - @prosopo/env@3.6.4

## 3.1.34
### Patch Changes

- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/types@4.9.1
  - @prosopo/util@3.3.3
  - @prosopo/env@3.6.3
  - @prosopo/common@3.1.42
  - @prosopo/logger@2.0.1
  - @prosopo/api-route@2.6.50

## 3.1.33
### Patch Changes

  - @prosopo/env@3.6.2

## 3.1.32
### Patch Changes

- a444abe: chore(deps): bump uuid from 14.0.0 to 14.0.1
- 8c8898d: chore(deps): bump uuid from 11.1.0 to 14.0.0 in /packages/api-express-router
- 41e0e11: Tighten @prosopo/logger public exports: drop the stringifyBigInts re-export (import it from @prosopo/util instead) and stop exporting internal-only symbols (level/format string constants and LevelMap).
- 11f1e8c: Replace vague logger scopes (empty strings, import.meta.url, generic "CLI") with structured colon-delimited names following the convention package:subsystem:action.
- Updated dependencies [dfb0c53]
- Updated dependencies [7ebb78f]
- Updated dependencies [b9f5eca]
- Updated dependencies [849af99]
- Updated dependencies [a5ba27b]
- Updated dependencies [d1fbde3]
- Updated dependencies [948d36b]
- Updated dependencies [41e0e11]
- Updated dependencies [11f1e8c]
- Updated dependencies [3c80664]
- Updated dependencies [a26e9d0]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
  - @prosopo/common@3.1.41
  - @prosopo/logger@2.0.0
  - @prosopo/util-crypto@13.5.30
  - @prosopo/util@3.3.2
  - @prosopo/types@4.9.0
  - @prosopo/api-route@2.6.49
  - @prosopo/env@3.6.1

## 3.1.31
### Patch Changes

- Updated dependencies [12cd0a6]
- Updated dependencies [12cd0a6]
  - @prosopo/types@4.8.0
  - @prosopo/env@3.6.0

## 3.1.30
### Patch Changes

- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4
  - @prosopo/env@3.5.20

## 3.1.29
### Patch Changes

- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/env@3.5.19

## 3.1.28
### Patch Changes

- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/types@4.7.2
  - @prosopo/locale@3.2.5
  - @prosopo/logger@1.0.4
  - @prosopo/env@3.5.18
  - @prosopo/common@3.1.40
  - @prosopo/api-route@2.6.48

## 3.1.27
### Patch Changes

- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1
  - @prosopo/env@3.5.17

## 3.1.26
### Patch Changes

- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0
  - @prosopo/env@3.5.16

## 3.1.25
### Patch Changes

- Updated dependencies [4626340]
  - @prosopo/types@4.6.1
  - @prosopo/env@3.5.15

## 3.1.24
### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/types@4.6.0
  - @prosopo/logger@1.0.3
  - @prosopo/common@3.1.39
  - @prosopo/env@3.5.14
  - @prosopo/api-route@2.6.47

## 3.1.23
### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0
  - @prosopo/env@3.5.13

## 3.1.22
### Patch Changes

  - @prosopo/env@3.5.12

## 3.1.21
### Patch Changes

- Updated dependencies [f69724f]
- Updated dependencies [3973078]
  - @prosopo/types@4.4.1
  - @prosopo/env@3.5.11

## 3.1.20
### Patch Changes

- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types@4.4.0
  - @prosopo/env@3.5.10

## 3.1.19
### Patch Changes

  - @prosopo/env@3.5.9

## 3.1.18
### Patch Changes

- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/env@3.5.8

## 3.1.17
### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [97cf7bd]
- Updated dependencies [6ca1125]
- Updated dependencies [32a591b]
  - @prosopo/types@4.3.0
  - @prosopo/logger@1.0.2
  - @prosopo/common@3.1.38
  - @prosopo/env@3.5.7
  - @prosopo/api-route@2.6.46

## 3.1.16
### Patch Changes

- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/env@3.5.6

## 3.1.15
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.
- Updated dependencies [0fd81af]
  - @prosopo/api-route@2.6.45
  - @prosopo/common@3.1.37
  - @prosopo/env@3.5.5
  - @prosopo/logger@1.0.1

## 3.1.14
### Patch Changes

- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0
  - @prosopo/env@3.5.4

## 3.1.13
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4
  - @prosopo/env@3.5.3

## 3.1.12
### Patch Changes

- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/types@4.1.3
  - @prosopo/locale@3.2.4
  - @prosopo/common@3.1.36
  - @prosopo/env@3.5.2
  - @prosopo/api-route@2.6.44

## 3.1.11
### Patch Changes

  - @prosopo/types@4.1.2
  - @prosopo/env@3.5.1

## 3.1.10
### Patch Changes

- Updated dependencies [53bfd45]
- Updated dependencies [91958da]
  - @prosopo/locale@3.2.3
  - @prosopo/env@3.5.0
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35
  - @prosopo/api-route@2.6.43

## 3.1.9
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/env@3.4.9

## 3.1.8
### Patch Changes

- Updated dependencies [3c0be68]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [d865319]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4993813]
  - @prosopo/types@4.0.0
  - @prosopo/locale@3.2.2
  - @prosopo/common@3.1.34
  - @prosopo/env@3.4.8
  - @prosopo/api-route@2.6.42

## 3.1.7
### Patch Changes

- Updated dependencies [819ed95]
  - @prosopo/types@3.16.1
  - @prosopo/env@3.4.7

## 3.1.6
### Patch Changes

  - @prosopo/env@3.4.6

## 3.1.5
### Patch Changes

  - @prosopo/env@3.4.5

## 3.1.4
### Patch Changes

  - @prosopo/env@3.4.4

## 3.1.3
### Patch Changes

- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types@3.16.0
  - @prosopo/env@3.4.3

## 3.1.2
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0
  - @prosopo/env@3.4.2

## 3.1.1
### Patch Changes

- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
- Updated dependencies [b94890c]
  - @prosopo/types@3.14.1
  - @prosopo/locale@3.2.1
  - @prosopo/common@3.1.33
  - @prosopo/env@3.4.1
  - @prosopo/api-route@2.6.41

## 3.1.0
### Minor Changes

- 42650db: Add better spam rules and move ipinfo service to local instead of external

### Patch Changes

- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/locale@3.2.0
  - @prosopo/types@3.14.0
  - @prosopo/env@3.4.0
  - @prosopo/common@3.1.32
  - @prosopo/api-route@2.6.40

## 3.0.70
### Patch Changes

- Updated dependencies [4a9c518]
  - @prosopo/common@3.1.31
  - @prosopo/api-route@2.6.39
  - @prosopo/env@3.3.15

## 3.0.69
### Patch Changes

  - @prosopo/types@3.13.3
  - @prosopo/env@3.3.14

## 3.0.68
### Patch Changes

  - @prosopo/types@3.13.2
  - @prosopo/env@3.3.13

## 3.0.67
### Patch Changes

  - @prosopo/types@3.13.1
  - @prosopo/env@3.3.12

## 3.0.66
### Patch Changes

- Updated dependencies [e6d9553]
  - @prosopo/types@3.13.0
  - @prosopo/env@3.3.11

## 3.0.65
### Patch Changes

- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/types@3.12.3
  - @prosopo/env@3.3.10

## 3.0.64
### Patch Changes

- Updated dependencies [adb89a6]
  - @prosopo/locale@3.1.29
  - @prosopo/types@3.12.2
  - @prosopo/env@3.3.9
  - @prosopo/common@3.1.30
  - @prosopo/api-route@2.6.38

## 3.0.63
### Patch Changes

- Updated dependencies [c5ee492]
- Updated dependencies [a90eb54]
  - @prosopo/common@3.1.29
  - @prosopo/types@3.12.1
  - @prosopo/api-route@2.6.37
  - @prosopo/env@3.3.8

## 3.0.62
### Patch Changes

- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/types@3.12.0
  - @prosopo/env@3.3.7

## 3.0.61
### Patch Changes

- Updated dependencies [8148587]
  - @prosopo/types@3.11.1
  - @prosopo/env@3.3.6

## 3.0.60
### Patch Changes

  - @prosopo/env@3.3.5

## 3.0.59
### Patch Changes

- ca7f4ad: Attach site key and user to logger earlier
- Updated dependencies [7f6ffc5]
  - @prosopo/types@3.11.0
  - @prosopo/env@3.3.4

## 3.0.58
### Patch Changes

- Updated dependencies [93fa086]
  - @prosopo/types@3.10.2
  - @prosopo/env@3.3.3

## 3.0.57
### Patch Changes

- Updated dependencies [cde7550]
  - @prosopo/types@3.10.1
  - @prosopo/env@3.3.2

## 3.0.56
### Patch Changes

- Updated dependencies [ad6d622]
  - @prosopo/types@3.10.0
  - @prosopo/env@3.3.1

## 3.0.55
### Patch Changes

- Updated dependencies [ff58a70]
  - @prosopo/types@3.9.0
  - @prosopo/env@3.3.0

## 3.0.54
### Patch Changes

  - @prosopo/env@3.2.42

## 3.0.53
### Patch Changes

- Updated dependencies [d2431cd]
  - @prosopo/types@3.8.4
  - @prosopo/env@3.2.41

## 3.0.52
### Patch Changes

  - @prosopo/env@3.2.40

## 3.0.51
### Patch Changes

- Updated dependencies [bd6995b]
  - @prosopo/types@3.8.3
  - @prosopo/env@3.2.39

## 3.0.50
### Patch Changes

- Updated dependencies [9633e58]
  - @prosopo/types@3.8.2
  - @prosopo/env@3.2.38

## 3.0.49
### Patch Changes

- Updated dependencies [f52a5c1]
  - @prosopo/types@3.8.1
  - @prosopo/env@3.2.37

## 3.0.48
### Patch Changes

  - @prosopo/env@3.2.36

## 3.0.47
### Patch Changes

- 3acc333: Add JWT issuance to keypairs
- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- 3acc333: Release 3.3.0
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [7543d17]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/util-crypto@13.5.29
  - @prosopo/types@3.8.0
  - @prosopo/api-route@2.6.36
  - @prosopo/common@3.1.28
  - @prosopo/locale@3.1.28
  - @prosopo/env@3.2.35

## 3.0.46
### Patch Changes

  - @prosopo/env@3.2.34

## 3.0.45
### Patch Changes

  - @prosopo/env@3.2.33

## 3.0.44
### Patch Changes

  - @prosopo/env@3.2.32

## 3.0.43
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/env@3.2.31

## 3.0.42
### Patch Changes

- Updated dependencies [345b25b]
  - @prosopo/types@3.7.1
  - @prosopo/env@3.2.30

## 3.0.41
### Patch Changes

- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
- Updated dependencies [e01227b]
  - @prosopo/types@3.7.0
  - @prosopo/locale@3.1.27
  - @prosopo/common@3.1.27
  - @prosopo/env@3.2.29
  - @prosopo/api-route@2.6.35

## 3.0.40
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/api-route@2.6.34
  - @prosopo/common@3.1.26
  - @prosopo/env@3.2.28
  - @prosopo/locale@3.1.26
  - @prosopo/types@3.6.4

## 3.0.39
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/api-route@2.6.33
  - @prosopo/common@3.1.25
  - @prosopo/env@3.2.27
  - @prosopo/locale@3.1.25
  - @prosopo/types@3.6.3

## 3.0.38
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/api-route@2.6.32
  - @prosopo/common@3.1.24
  - @prosopo/locale@3.1.24
  - @prosopo/types@3.6.2
  - @prosopo/env@3.2.26

## 3.0.37
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/api-route@2.6.31
  - @prosopo/common@3.1.23
  - @prosopo/env@3.2.25
  - @prosopo/locale@3.1.23
  - @prosopo/types@3.6.1

## 3.0.36
### Patch Changes

  - @prosopo/env@3.2.24

## 3.0.35
### Patch Changes

  - @prosopo/env@3.2.23

## 3.0.34
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/types@3.6.0
  - @prosopo/api-route@2.6.30
  - @prosopo/common@3.1.22
  - @prosopo/locale@3.1.22
  - @prosopo/env@3.2.22
  - @prosopo/config@3.1.22

## 3.0.33
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/env@3.2.21

## 3.0.32
### Patch Changes

- Updated dependencies [cb8ab85]
  - @prosopo/types@3.5.10
  - @prosopo/env@3.2.20

## 3.0.31
### Patch Changes

- Updated dependencies [43907e8]
- Updated dependencies [7101036]
  - @prosopo/types@3.5.9
  - @prosopo/env@3.2.19

## 3.0.30
### Patch Changes

- Updated dependencies [e5c259d]
  - @prosopo/types@3.5.8
  - @prosopo/env@3.2.18

## 3.0.29
### Patch Changes

- b8185a4: feat/uap-rules-syncer
- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
  - @prosopo/common@3.1.21
  - @prosopo/api-route@2.6.29
  - @prosopo/config@3.1.21
  - @prosopo/env@3.2.17
  - @prosopo/locale@3.1.21
  - @prosopo/types@3.5.7

## 3.0.28
### Patch Changes

- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/env@3.2.16

## 3.0.27
### Patch Changes

- Updated dependencies [494c5a8]
  - @prosopo/types@3.5.5
  - @prosopo/env@3.2.15

## 3.0.26
### Patch Changes

- Updated dependencies [08ff50f]
  - @prosopo/types@3.5.4
  - @prosopo/env@3.2.14

## 3.0.25
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/api-route@2.6.28
  - @prosopo/common@3.1.20
  - @prosopo/env@3.2.13
  - @prosopo/locale@3.1.20
  - @prosopo/types@3.5.3

## 3.0.24
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/api-route@2.6.27
  - @prosopo/locale@3.1.19
  - @prosopo/types@3.5.2
  - @prosopo/env@3.2.12
  - @prosopo/config@3.1.19

## 3.0.23
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/api-route@2.6.26
  - @prosopo/common@3.1.18
  - @prosopo/locale@3.1.18
  - @prosopo/env@3.2.11
  - @prosopo/config@3.1.18

## 3.0.22
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/api-route@2.6.25
  - @prosopo/common@3.1.17
  - @prosopo/locale@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/env@3.2.10
  - @prosopo/config@3.1.17

## 3.0.21
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/api-route@2.6.24
  - @prosopo/common@3.1.16
  - @prosopo/locale@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/env@3.2.9
  - @prosopo/config@3.1.16

## 3.0.20
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/api-route@2.6.23
  - @prosopo/common@3.1.15
  - @prosopo/locale@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/env@3.2.8
  - @prosopo/config@3.1.15

## 3.0.19
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/api-route@2.6.22
  - @prosopo/common@3.1.14
  - @prosopo/locale@3.1.14
  - @prosopo/env@3.2.7
  - @prosopo/config@3.1.14

## 3.0.18
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types@3.2.1
  - @prosopo/api-route@2.6.21
  - @prosopo/common@3.1.13
  - @prosopo/locale@3.1.13
  - @prosopo/env@3.2.6
  - @prosopo/config@3.1.13

## 3.0.17
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [0824221]
  - @prosopo/types@3.2.0
  - @prosopo/api-route@2.6.20
  - @prosopo/common@3.1.12
  - @prosopo/locale@3.1.12
  - @prosopo/env@3.2.5
  - @prosopo/config@3.1.12

## 3.0.16
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/types@3.1.4
  - @prosopo/api-route@2.6.19
  - @prosopo/common@3.1.11
  - @prosopo/env@3.2.4
  - @prosopo/config@3.1.11

## 3.0.15
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/api-route@2.6.18
  - @prosopo/common@3.1.10
  - @prosopo/locale@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/env@3.2.3
  - @prosopo/config@3.1.10

## 3.0.14
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
  - @prosopo/locale@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/env@3.2.2
  - @prosopo/config@3.1.9

## 3.0.13
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/types@3.1.1
  - @prosopo/api-route@2.6.16
  - @prosopo/common@3.1.8
  - @prosopo/locale@3.1.8
  - @prosopo/env@3.2.1
  - @prosopo/config@3.1.8

## 3.0.12
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/api-route@2.6.15
  - @prosopo/common@3.1.7
  - @prosopo/locale@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/env@3.2.0
  - @prosopo/config@3.1.7

## 3.0.11
### Patch Changes

- a07db04: Release 3.1.12
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
  - @prosopo/config@3.1.6
  - @prosopo/env@3.1.11
  - @prosopo/api-route@2.6.14
  - @prosopo/common@3.1.6
  - @prosopo/locale@3.1.6
  - @prosopo/types@3.0.10

## 3.0.10
### Patch Changes

  - @prosopo/env@3.1.10

## 3.0.9
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/locale@3.1.5
  - @prosopo/api-route@2.6.13
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9
  - @prosopo/env@3.1.9

## 3.0.8
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/api-route@2.6.12
  - @prosopo/common@3.1.4

## 3.0.7
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/api-route@2.6.11

## 3.0.6
### Patch Changes

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
  - @prosopo/api-route@2.6.10
  - @prosopo/common@3.1.2
  - @prosopo/config@3.1.3

## 3.0.5
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/api-route@2.6.9
  - @prosopo/common@3.1.1
  - @prosopo/config@3.1.2

## 3.0.4
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- f29fc7e: Refining API error handling. Adding more language strings
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/api-route@2.6.8
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.0.3
### Patch Changes

- 9671152: uuid

## 3.0.2
### Patch Changes

  - @prosopo/common@3.0.2
  - @prosopo/api-route@2.6.7

## 3.0.1
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/api-route@2.6.6

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/api-route@2.6.5

## 2.6.4
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/api-route@2.6.4
  - @prosopo/common@2.7.2

## 2.6.3
### Patch Changes

  - @prosopo/common@2.7.1
  - @prosopo/api-route@2.6.3

## 2.6.2
### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0
  - @prosopo/api-route@2.6.2

## 2.6.1

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/api-route@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/api-route@2.6.0
  - @prosopo/common@2.6.0
