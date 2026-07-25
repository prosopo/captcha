---
"@prosopo/types": patch
"@prosopo/provider": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-frictionless": patch
---

feat(decision-machine): thread puzzle fields and forward checkbox coords on escalation

- Add optional `coords` and `puzzleEvents` to `DecisionMachineInput` so decision machines can gate on entry-point telemetry and puzzle drag trails.
- Populate `coords` on the pow, puzzle and image `decide()` inputs. Puzzle also passes `puzzleEvents`. Image gains `behavioralDataPacked` / `deviceCapability` — previously always undefined, which silently disabled the global synthetic-mouse-timing check on the one captcha type it targets.
- Extend `ProcaptchaEscalationHandler` with an optional `coords` argument so the PoW widget can forward its trusted checkbox click through the PoW→image/puzzle escalation. The frictionless wrapper prefers escalation coords over pending retry coords. Puzzle and image widgets already accept `startCoords`, so the escalated widget now seeds the salt with the real (x, y) instead of (0, 0).
