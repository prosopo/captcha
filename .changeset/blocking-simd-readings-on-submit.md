---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha": patch
---

feat(procaptcha): block on SIMD readings at solution submit

Solution submit is the last hop the client controls, so it's the last chance to
attach the catcher's WASM SIMD readings for a session. The image, PoW and puzzle
managers now wait for the benchmark there via a shared
`getSimdReadingsForSubmit` helper, capped at 5s, instead of attaching only
whatever the prefetch happened to have resolved.

The helper passes the budget down to the detector *and* races it locally — the
detector ships prebuilt, so a bundle that ignores `timeoutMs` (or a benchmark
wedged on a busy main thread) can't hang the submission. It never rejects: a
missing accessor, a rejection, a synchronous throw and a timeout all resolve to
`undefined` and the solution is submitted without readings, so a user is never
failed over telemetry.

The earlier frictionless POST and challenge GET hops are unchanged and remain
non-blocking.
