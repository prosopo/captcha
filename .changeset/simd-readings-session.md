---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/api": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/provider": patch
---

Plumb the WASM SIMD CPU fingerprint readings (collected by the catcher
client per https://blog.azerpas.com/writing/wasm-simd-fingerprinting/)
through each captcha solution payload (PoW / Puzzle / Image) and onto the
linked `Session` record. Collection-only — no scoring or classification.

- `SimdReadings` discriminated union + `SimdOpReadingRecord` /
  `SimdOpCategory` in `@prosopo/types`, plus `simdReadingsCodec` shared
  encode/decode helpers so the browser SDK and the provider use the same
  pipe-safe wire format.
- Optional `simdReadings: string()` on `CaptchaSolutionBody`,
  `SubmitPowCaptchaSolutionBody`, and `SubmitPuzzleCaptchaSolutionBody`.
- `FrictionlessState.getSimdReadings` + `BotDetectionFunctionResult.getSimdReadings`
  so the catcher's prefetched benchmark is consumed at submit time.
- `ProcaptchaApiInterface.submitCaptchaSolution` and the three
  `ProviderApi.submit*Solution` client methods accept the field.
- Provider handlers decode via `decodeSimdReadings` and persist on the
  linked Session via `updateSessionRecord` (Mongoose `Mixed`, Zod
  discriminated-union validation at the edge).

Backward-compatible: older catcher clients omit the field; the session
record omits it in turn.
