# @prosopo/ipinfo

## 0.2.27
### Patch Changes

- Updated dependencies [7ebb78f]
- Updated dependencies [948d36b]
- Updated dependencies [41e0e11]
- Updated dependencies [3c80664]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
  - @prosopo/logger@2.0.0
  - @prosopo/types@4.9.0

## 0.2.26
### Patch Changes

- Updated dependencies [12cd0a6]
- Updated dependencies [12cd0a6]
  - @prosopo/types@4.8.0

## 0.2.25
### Patch Changes

- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4

## 0.2.24
### Patch Changes

- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3

## 0.2.23
### Patch Changes

- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/types@4.7.2
  - @prosopo/logger@1.0.4

## 0.2.22
### Patch Changes

- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1

## 0.2.21
### Patch Changes

- 3a46191: feat(traffic-filter): allowlist datacenter operators by name
  
  Apple's iCloud Private Relay exits from datacenter IPs, so sites with
  `blockDatacenter: true` were dropping legitimate Safari traffic. ipapi
  already reports the operator name verbatim in `datacenter.datacenter`
  — expose it on `IPInfoResult.datacenterName` and let `TrafficFilter`
  carry an optional `datacenterNameAllowlist` so operators can opt the
  relay traffic through without disabling the rest of the rule. Match
  is case-/whitespace-insensitive; the allowlist only suppresses the
  datacenter check, so a VPN/Tor/Proxy/Abuser hit on the same IP still
  blocks. New field is wired through Zod (capped 50 × 128 chars) and
  the Mongoose client settings schema so it persists.
- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0

## 0.2.20
### Patch Changes

- Updated dependencies [4626340]
  - @prosopo/types@4.6.1

## 0.2.19
### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/types@4.6.0
  - @prosopo/logger@1.0.3

## 0.2.18
### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0

## 0.2.17
### Patch Changes

- Updated dependencies [f69724f]
- Updated dependencies [3973078]
  - @prosopo/types@4.4.1

## 0.2.16
### Patch Changes

- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types@4.4.0

## 0.2.15
### Patch Changes

- 9b18b31: Bump @prosopo/ipinfo so npm accepts the trusted-publishing publish. Version 0.2.14 was previously burned on the registry; this republishes at 0.2.15.
- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1

## 0.2.14
### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [97cf7bd]
- Updated dependencies [6ca1125]
- Updated dependencies [32a591b]
  - @prosopo/types@4.3.0
  - @prosopo/logger@1.0.2

## 0.2.13
### Patch Changes

- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1

## 0.2.12
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.
- Updated dependencies [0fd81af]
  - @prosopo/logger@1.0.1

## 0.2.11
### Patch Changes

- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0

## 0.2.10
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4

## 0.2.9
### Patch Changes

- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/types@4.1.3
  - @prosopo/common@3.1.36

## 0.2.8
### Patch Changes

  - @prosopo/types@4.1.2

## 0.2.7
### Patch Changes

- Updated dependencies [91958da]
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35

## 0.2.6
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0

## 0.2.5
### Patch Changes

- Updated dependencies [3c0be68]
- Updated dependencies [f9ea09d]
- Updated dependencies [d865319]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4993813]
  - @prosopo/types@4.0.0
  - @prosopo/common@3.1.34

## 0.2.4
### Patch Changes

- Updated dependencies [819ed95]
  - @prosopo/types@3.16.1

## 0.2.3
### Patch Changes

- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types@3.16.0

## 0.2.2
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0

## 0.2.1
### Patch Changes

- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
  - @prosopo/types@3.14.1
  - @prosopo/common@3.1.33

## 0.2.0
### Minor Changes

- 42650db: Add better spam rules and move ipinfo service to local instead of external

### Patch Changes

- fc514dd: ability to block different types of traffic
- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/types@3.14.0
  - @prosopo/common@3.1.32
