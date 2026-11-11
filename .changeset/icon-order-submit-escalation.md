---
"@prosopo/types": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-icon-order": minor
"@prosopo/procaptcha-frictionless": patch
---

Let the routing machine escalate a correct icon order solve to a follow-up challenge, the same way it can escalate a PoW solve.

After a correct icon order submission, the provider runs the site's routing machine again with the new `postIconOrder` phase. The machine sees the pointer trail, the clicks and the behavioural data (`raw.iconOrderEvents`, `raw.iconOrderClicks`, `raw.deviceCapability`). If it routes to image or puzzle, the provider creates the follow-up session and answers `{ verified: false, escalation: { captchaType, sessionId } }`. The icon order record is disapproved with `CAPTCHA_DECISION_MACHINE_DENIED`, so its token can never verify. The session is not marked blocked, because the user is still being challenged.

The icon order widget hands an escalation to the frictionless wrapper's `onEscalate`, which opens the follow-up challenge straight away. `submitSolution` now returns `"verified"`, `"escalated"` or `"failed"`. Without a wrapper, an escalation fails like a rejected solve.

A machine that doesn't handle the new phase returns its baseline, so nothing changes until a machine opts in. Session minting for escalations moved out of the PoW handler into `mintEscalation`, which PoW and icon order share.
