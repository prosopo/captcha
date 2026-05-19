---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

Plumb the WASM SIMD CPU fingerprint readings (collected by the
catcher client per https://blog.azerpas.com/writing/wasm-simd-fingerprinting/)
through the frictionless token into the `Session` record so the
dataset can be built up on real traffic. Collection-only — no scoring
or classification.

- `SimdReadings` discriminated union + `SimdOpReadingRecord` /
  `SimdOpCategory` added to `@prosopo/types`. `DetectorResult` gains an
  optional `simdReadings` field.
- `Session` gains an optional `simdReadings`. `SimdReadingsSchema`
  (Zod discriminated union) validates the wire form at the edge;
  Mongoose persists it as `Mixed`.
- Provider's `getBotScore`, `decryptPayload`, `setSessionParams`, and
  `createSession` thread the field through to the persisted record.

Backward-compatible: older catcher clients omit the field and the
session record omits it in turn.
