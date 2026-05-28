---
"@prosopo/types": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-pow": minor
---

feat(provider): re-route after PoW using decrypted behavioural data

PoW solutions are now re-evaluated by the routing machine after submission.
Previously the routing decision was made up-front on a thin set of signals;
behavioural data only becomes available (decrypted server-side) once the
user submits their PoW solution, so a user with weak behavioural signals
could still earn a token by solving PoW alone.

The submit endpoint now runs the routing machine a second time in a new
`postPow` phase, feeding in the decrypted behavioural data, the originating
session's score, request headers, JA4, and IP info. If the router escalates,
the provider mints a fresh session (carrying the original session's risk
profile) and returns `escalation: { captchaType, sessionId }` on the
`PowCaptchaSolutionResponse`. The `verified` flag is forced to `false` on
escalation — the user isn't done until they clear the follow-up.

On the client, `ProcaptchaFrictionless` accepts the escalation via a new
internal `onEscalate` prop on the PoW widget and mounts the chosen image
or puzzle widget in place, splicing the new sessionId into the
`FrictionlessState`. The handoff is internal to the frictionless → pow
flow — dapps integrating Procaptcha see no API change.

`RoutingMachineInputBase.phase` widens from `"route"` to
`"route" | "postPow"` so decision-machine configs can distinguish the two
passes.
