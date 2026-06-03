# @prosopo/procaptcha-puzzle

## 2.10.6
### Patch Changes

- 6c26669: Add per-site honeypot trap. When enabled, the provider attaches an encoded question (morse or semaphore, base64-wrapped) in the `x-prosopo-meta` response header on frictionless responses. The widget renders the value into an off-screen hidden input with `name="email_confirm"`; bots that auto-fill text inputs populate it and the value rides back on the solution submit as `clientMetaData.hp`, which is persisted on the `StoredCaptcha` record. Falls back to a random phrase from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH` when no custom question is configured.
- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/api@3.4.7
  - @prosopo/procaptcha-common@2.10.15

## 2.10.5
### Patch Changes

- Updated dependencies [0fd81af]
  - @prosopo/common@3.1.37
  - @prosopo/procaptcha-common@2.10.14

## 2.10.4
### Patch Changes

- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0
  - @prosopo/api@3.4.6
  - @prosopo/procaptcha-common@2.10.13

## 2.10.3
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4
  - @prosopo/api@3.4.5
  - @prosopo/procaptcha-common@2.10.12

## 2.10.2
### Patch Changes

- Updated dependencies [6567ce0]
- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/util@3.2.14
  - @prosopo/types@4.1.3
  - @prosopo/locale@3.2.4
  - @prosopo/api@3.4.4
  - @prosopo/common@3.1.36
  - @prosopo/procaptcha-common@2.10.11

## 2.10.1
### Patch Changes

- Updated dependencies [72a1218]
- Updated dependencies [566c1f6]
  - @prosopo/util@3.2.13
  - @prosopo/widget-skeleton@2.8.3
  - @prosopo/types@4.1.2
  - @prosopo/procaptcha-common@2.10.10
  - @prosopo/api@3.4.3

## 2.10.0
### Minor Changes

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

### Patch Changes

- Updated dependencies [53bfd45]
- Updated dependencies [91958da]
  - @prosopo/procaptcha-common@2.10.9
  - @prosopo/locale@3.2.3
  - @prosopo/api@3.4.2
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35

## 2.9.2
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/api@3.4.1
  - @prosopo/procaptcha-common@2.10.8

## 2.9.1
### Patch Changes

  - @prosopo/procaptcha-common@2.10.7

## 2.9.0
### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.
- 273926d: Fix `/captcha/{type}` endpoints looping with "No session found" when the
  Redis session cache and Mongo diverge: on a session lookup miss the cache
  entry is now invalidated, so the next `/frictionless` falls through and
  creates a fresh session instead of resurrecting the dead one.
  
  Add invisible-mode support to the puzzle captcha widget: the
  execute-event handler now drives the full phase transition
  (`start` → `setChallengeData` → `dragging`), and the puzzle overlay is
  rendered in invisible mode so the user can still solve the (inherently
  interactive) drag challenge — only the checkbox UI is hidden.
  
  Add `invisible-puzzle-implicit.html` / `invisible-puzzle-explicit.html`
  demo pages, and surface both standard and invisible puzzle entries in
  the client-bundle-example navbar.

### Patch Changes

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
- Updated dependencies [4aae4e6]
- Updated dependencies [d865319]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4993813]
- Updated dependencies [5f1ae53]
  - @prosopo/types@4.0.0
  - @prosopo/api@3.4.0
  - @prosopo/locale@3.2.2
  - @prosopo/util@3.2.12
  - @prosopo/common@3.1.34
  - @prosopo/widget-skeleton@2.8.2
  - @prosopo/procaptcha-common@2.10.6
