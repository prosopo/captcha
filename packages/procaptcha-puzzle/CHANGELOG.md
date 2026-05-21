# @prosopo/procaptcha-puzzle

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
