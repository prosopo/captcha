---
"@prosopo/provider": minor
"@prosopo/procaptcha-puzzle": minor
"@prosopo/env": minor
"@prosopo/database": minor
"@prosopo/api": patch
"@prosopo/types": patch
---

Puzzle captcha + maintenance mode hardening, plus a refactor of the
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
