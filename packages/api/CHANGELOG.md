# @prosopo/api

## 3.4.8
### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
  - @prosopo/types@4.3.0

## 3.4.7
### Patch Changes

- 6c26669: Add per-site honeypot trap. When enabled, the provider attaches an encoded question (morse or semaphore, base64-wrapped) in the `x-prosopo-meta` response header on frictionless responses. The widget renders the value into an off-screen hidden input with `name="email_confirm"`; bots that auto-fill text inputs populate it and the value rides back on the solution submit as `clientMetaData.hp`, which is persisted on the `StoredCaptcha` record. Falls back to a random phrase from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH` when no custom question is configured.
- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1

## 3.4.6
### Patch Changes

- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0

## 3.4.5
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4

## 3.4.4
### Patch Changes

- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/types@4.1.3

## 3.4.3
### Patch Changes

  - @prosopo/types@4.1.2

## 3.4.2
### Patch Changes

- 91958da: Puzzle captcha + maintenance mode hardening, plus a refactor of the
  frictionless handler into focused modules.
  
  - **Puzzle captcha now records checkbox-click coordinates like POW.** Adds an
    optional `salt` field to `SubmitPuzzleCaptchaSolutionBody`; the puzzle
    widget hashes the click coords into the salt and the server decodes them
    into the puzzle record's `coords` field on submit. New `start(x, y)`
    parameters on `procaptcha-puzzle` Manager + widget.
  - **Fix puzzle "No session found" caused by stale Redis dedup.** The
    `/frictionless` dedup path is now Mongo-authoritative — Redis is no
    longer consulted as a session source. A concurrent `/captcha/{type}`
    invalidation could previously race a fire-and-forget Redis repopulation
    in the `/frictionless` dedup branch, leaving Redis pointing at a
    Mongo-deleted session for the full 1-hour TTL. Stale pointers are now
    evicted lazily.
  - **Maintenance mode operates without MongoDB.** `/frictionless` and
    `/captcha/{pow,puzzle}` short-circuit to dummy responses before any DB
    call, and `Environment.isReady()` tolerates a Mongo connect failure when
    `MAINTENANCE_MODE=true` so the provider can start with Mongo down.
  - **Refactor `getFrictionlessCaptchaChallenge.ts` into focused modules** under
    `getFrictionlessCaptchaChallenge/` (handler, sessionDedup, shortCircuit,
    accessPolicy, decisionMachine, decryptSimdReadings, constants). Original
    import path preserved via a re-export shim.
  - **Move `RedisWriteQueue` from `@prosopo/provider` to `@prosopo/database`**
    (where the Redis connection itself lives), and clear residual Redis
    session keys at provider startup via `Environment.cleanup()` so a
    previously-crashed run can't leak stale dedup pointers.
  - Adds puzzle-type branch to access-policy handling in `/frictionless`.
- Updated dependencies [91958da]
  - @prosopo/types@4.1.1

## 3.4.1
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0

## 3.4.0
### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.

### Patch Changes

- 3c0be68: Add a new admin-only endpoint `POST /v1/prosopo/provider/admin/counters/clear-all`
  for deleting per-sitekey usage counters from Redis. Intended for manual
  testing of routing decision machines and staging-environment resets — not
  part of the hot path.
  
  - `ClearAllCountersBody` (optional `dapp`) and `ClearAllCountersResponse`
    (`success`, `deletedCount`, `scope`) zod schemas in `@prosopo/types`,
    plus `AdminApiPaths.ClearAllCounters` and a 10/60s rate limit.
  - `UsageCounters.clearAll(dappAccount?)` in the provider, using Redis
    `SCAN` + `DEL` in 500-key batches. Returns null on Redis failure so
    callers can surface the underlying error.
  - `ApiClearAllCountersEndpoint` wired through `ApiAdminRoutesProvider`.
  - `ProviderApi.clearAllCounters(jwt, dappAccount?)` client method.
- 4aae4e6: Plumb the WASM SIMD CPU fingerprint readings (collected by the catcher
  client per https://blog.azerpas.com/writing/wasm-simd-fingerprinting/)
  through the captcha flow and onto the linked `Session` record.
  Collection-only — no scoring or classification yet.
  
  The readings are sent at the earliest moment they're available so the
  signal lands on the session as soon as possible:
  
  1. **Captcha-challenge GET** (PoW / Puzzle / Image) — the procaptcha
     Manager calls `frictionlessState.getSimdReadings(0)` (non-blocking
     cache check) and attaches it to the challenge-request body. The
     provider handler decodes and patches the linked session via
     `updateSessionRecord`.
  2. **Solution submission** (PoW / Puzzle / Image) — same non-blocking
     check on the submit body. Acts as a backup if the benchmark wasn't
     ready in time for the challenge GET.
  
  Frictionless init itself stays SIMD-free (benchmark is too slow to gate
  the first hop).
  
  Surface area:
  
  - `SimdReadings` discriminated union + `SimdOpReadingRecord` /
    `SimdOpCategory` in `@prosopo/types`, plus `simdReadingsCodec` shared
    encode/decode helpers so the browser SDK and the provider use the same
    pipe-safe wire format.
  - Optional `simdReadings: string()` on `CaptchaRequestBody`,
    `GetPowCaptchaChallengeRequestBody`, `GetPuzzleCaptchaChallengeRequestBody`,
    `CaptchaSolutionBody`, `SubmitPowCaptchaSolutionBody`, and
    `SubmitPuzzleCaptchaSolutionBody`.
  - `FrictionlessState.getSimdReadings` + `BotDetectionFunctionResult.getSimdReadings`
    so the catcher's prefetched benchmark is consumed at the request sites.
  - `ProcaptchaApiInterface.{getCaptchaChallenge, submitCaptchaSolution}` and
    the `ProviderApi.{getCaptchaChallenge, getPowCaptchaChallenge, getPuzzleCaptchaChallenge,
    submitCaptchaSolution, submitPowCaptchaSolution, submitPuzzleCaptchaSolution}`
    client methods accept the field.
  - Provider challenge + solution handlers decode via `decodeSimdReadings`
    and `updateSessionRecord` (Mongoose `Mixed`, Zod discriminated-union
    validation at the edge). The challenge-GET patch is fire-and-forget.
  
  Backward-compatible: older catcher clients omit the field at every layer;
  the session record omits it in turn.
- Updated dependencies [3c0be68]
- Updated dependencies [f9ea09d]
- Updated dependencies [d865319]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
  - @prosopo/types@4.0.0

## 3.3.2
### Patch Changes

- 819ed95: Adding invisible mode to session data
- Updated dependencies [819ed95]
  - @prosopo/types@3.16.1

## 3.3.1
### Patch Changes

- f6a4402: API endpoint for removing site keys
- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types@3.16.0

## 3.3.0
### Minor Changes

- 3e54c0a: Rate limits by client

### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0

## 3.2.11
### Patch Changes

- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
  - @prosopo/types@3.14.1

## 3.2.10
### Patch Changes

- 7be39c4: Add register site keys endpoint def
- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/types@3.14.0

## 3.2.9
### Patch Changes

  - @prosopo/types@3.13.3

## 3.2.8
### Patch Changes

  - @prosopo/types@3.13.2

## 3.2.7
### Patch Changes

  - @prosopo/types@3.13.1

## 3.2.6
### Patch Changes

- Updated dependencies [e6d9553]
  - @prosopo/types@3.13.0

## 3.2.5
### Patch Changes

- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/types@3.12.3

## 3.2.4
### Patch Changes

- adb89a6: Disposable email checking
- Updated dependencies [adb89a6]
  - @prosopo/types@3.12.2

## 3.2.3
### Patch Changes

- Updated dependencies [a90eb54]
  - @prosopo/types@3.12.1

## 3.2.2
### Patch Changes

- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/types@3.12.0

## 3.2.1
### Patch Changes

- Updated dependencies [8148587]
  - @prosopo/types@3.11.1

## 3.2.0
### Minor Changes

- 7f6ffc5: Store behavioural for image challenges

### Patch Changes

- Updated dependencies [7f6ffc5]
  - @prosopo/types@3.11.0

## 3.1.49
### Patch Changes

- 93fa086: Add decision engine endpoints
- Updated dependencies [93fa086]
  - @prosopo/types@3.10.2

## 3.1.48
### Patch Changes

- Updated dependencies [cde7550]
  - @prosopo/types@3.10.1

## 3.1.47
### Patch Changes

- Updated dependencies [ad6d622]
  - @prosopo/types@3.10.0

## 3.1.46
### Patch Changes

- Updated dependencies [ff58a70]
  - @prosopo/types@3.9.0

## 3.1.45
### Patch Changes

- Updated dependencies [d2431cd]
  - @prosopo/types@3.8.4

## 3.1.44
### Patch Changes

- Updated dependencies [bd6995b]
  - @prosopo/types@3.8.3

## 3.1.43
### Patch Changes

- 9633e58: Add captcha type to decision machine and run on image verification"
- Updated dependencies [9633e58]
  - @prosopo/types@3.8.2

## 3.1.42
### Patch Changes

- f52a5c1: Adding decision machine to provider for behavior detection
- Updated dependencies [f52a5c1]
  - @prosopo/types@3.8.1

## 3.1.41
### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- 3acc333: Release 3.3.0
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [7543d17]
- Updated dependencies [3acc333]
  - @prosopo/types@3.8.0

## 3.1.40
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2

## 3.1.39
### Patch Changes

- 345b25b: pow coord
- Updated dependencies [345b25b]
  - @prosopo/types@3.7.1

## 3.1.38
### Patch Changes

- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
  - @prosopo/types@3.7.0

## 3.1.37
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/types@3.6.4

## 3.1.36
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/types@3.6.3

## 3.1.35
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/types@3.6.2

## 3.1.34
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/types@3.6.1

## 3.1.33
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/types@3.6.0
  - @prosopo/config@3.1.22

## 3.1.32
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11

## 3.1.31
### Patch Changes

- cb8ab85: head entropy for bot detection
- Updated dependencies [cb8ab85]
  - @prosopo/types@3.5.10

## 3.1.30
### Patch Changes

- Updated dependencies [43907e8]
- Updated dependencies [7101036]
  - @prosopo/types@3.5.9

## 3.1.29
### Patch Changes

- Updated dependencies [e5c259d]
  - @prosopo/types@3.5.8

## 3.1.28
### Patch Changes

- c9d8fdf: feat/access-policy-group
- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21
  - @prosopo/types@3.5.7

## 3.1.27
### Patch Changes

- 5d11a81: Adding maintenance mode
- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6

## 3.1.26
### Patch Changes

- Updated dependencies [494c5a8]
  - @prosopo/types@3.5.5

## 3.1.25
### Patch Changes

- Updated dependencies [08ff50f]
  - @prosopo/types@3.5.4

## 3.1.24
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/types@3.5.3

## 3.1.23
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/types@3.5.2
  - @prosopo/config@3.1.19

## 3.1.22
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/config@3.1.18

## 3.1.21
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/types@3.5.0
  - @prosopo/config@3.1.17

## 3.1.20
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/types@3.4.1
  - @prosopo/config@3.1.16

## 3.1.19
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/user-access-policy@3.5.14
  - @prosopo/types@3.4.0
  - @prosopo/config@3.1.15

## 3.1.18
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/user-access-policy@3.5.13
  - @prosopo/config@3.1.14

## 3.1.17
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types@3.2.1
  - @prosopo/user-access-policy@3.5.12
  - @prosopo/config@3.1.13

## 3.1.16
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [0824221]
  - @prosopo/types@3.2.0
  - @prosopo/user-access-policy@3.5.11
  - @prosopo/config@3.1.12

## 3.1.15
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/types@3.1.4
  - @prosopo/user-access-policy@3.5.10
  - @prosopo/config@3.1.11

## 3.1.14
### Patch Changes

- 36b23e0: Fix entropy. Fix api call. Persist ja4 through logs.
- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/user-access-policy@3.5.9
  - @prosopo/types@3.1.3
  - @prosopo/config@3.1.10

## 3.1.13
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/user-access-policy@3.5.8
  - @prosopo/types@3.1.2
  - @prosopo/config@3.1.9

## 3.1.12
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/types@3.1.1
  - @prosopo/user-access-policy@3.5.7
  - @prosopo/config@3.1.8

## 3.1.11
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/user-access-policy@3.5.6
  - @prosopo/types@3.1.0
  - @prosopo/config@3.1.7

## 3.1.10
### Patch Changes

- a07db04: Release 3.1.12
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
  - @prosopo/config@3.1.6
  - @prosopo/user-access-policy@3.5.5
  - @prosopo/types@3.0.10

## 3.1.9
### Patch Changes

- Updated dependencies [553025d]
  - @prosopo/user-access-policy@3.5.4

## 3.1.8
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [6960643]
  - @prosopo/user-access-policy@3.5.3
  - @prosopo/types@3.0.9

## 3.1.7
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/types@3.0.8
  - @prosopo/user-access-policy@3.5.2

## 3.1.6
### Patch Changes

- 1f3a02f: Release 3.1.8
- Updated dependencies [1f3a02f]
  - @prosopo/user-access-policy@3.5.1

## 3.1.5
### Patch Changes

- Updated dependencies [e0628d9]
  - @prosopo/user-access-policy@3.5.0

## 3.1.4
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
- Updated dependencies [e090e2f]
  - @prosopo/config@3.1.4
  - @prosopo/user-access-policy@3.4.1
  - @prosopo/types@3.0.7

## 3.1.3
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
  - @prosopo/types@3.0.6
  - @prosopo/config@3.1.3
  - @prosopo/user-access-policy@3.4.0

## 3.1.2
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/user-access-policy@3.3.2
  - @prosopo/types@3.0.5
  - @prosopo/config@3.1.2

## 3.1.1
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/types@3.0.4
  - @prosopo/user-access-policy@3.3.1
  - @prosopo/config@3.1.1

## 3.1.0
### Minor Changes

- b7c3258: Add tests for UAPs

### Patch Changes

- Updated dependencies [b7c3258]
  - @prosopo/user-access-policy@3.3.0

## 3.0.8
### Patch Changes

- Updated dependencies [cdf7c29]
  - @prosopo/user-access-policy@3.2.1

## 3.0.7
### Patch Changes

- Updated dependencies [a7164ce]
  - @prosopo/user-access-policy@3.2.0

## 3.0.6
### Patch Changes

- b0d7207: Types for proper rotation
- Updated dependencies [b0d7207]
  - @prosopo/types@3.0.3
  - @prosopo/user-access-policy@3.1.5

## 3.0.5
### Patch Changes

  - @prosopo/user-access-policy@3.1.4

## 3.0.4
### Patch Changes

  - @prosopo/user-access-policy@3.1.3

## 3.0.3
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/types@3.0.2
  - @prosopo/user-access-policy@3.1.2

## 3.0.2
### Patch Changes

  - @prosopo/types@3.0.1
  - @prosopo/user-access-policy@3.1.1

## 3.0.1
### Patch Changes

- Updated dependencies [913f2a6]
  - @prosopo/user-access-policy@3.1.0

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/user-access-policy@3.0.0
  - @prosopo/types@3.0.0

## 2.7.2
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0

## 2.7.1
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/types@2.9.1

## 2.7.0
### Minor Changes

- d6de900: ip pass through

## 2.6.6
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/types@2.9.0

## 2.6.5
### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/types@2.8.0

## 2.6.4

### Patch Changes

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
  - @prosopo/types@2.6.0
