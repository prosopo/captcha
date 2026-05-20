---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/api": patch
"@prosopo/database": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/provider": patch
---

Plumb the WASM SIMD CPU fingerprint readings (collected by the catcher
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
