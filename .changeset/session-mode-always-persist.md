---
"@prosopo/provider": patch
---

fix(provider): always persist `mode` on the frictionless session

`getFrictionlessCaptchaChallenge` was collapsing anything that wasn't
`ModeEnum.invisible` to `undefined` before it reached the session
record. Mongoose then dropped the field on write, so today's DB carries
zero sessions with any `mode` value set — invisible or visible.

That makes it impossible to distinguish invisible from visible traffic
in analytics, and it blocks the follow-up on empty-`coords` records
(the checkbox-click coord is empty by design in invisible mode; we
need `Session.mode` to tell whether an empty-coords record came from a
legit invisible integration or from a widget-bypass bot).

Change: default `sessionMode` to `ModeEnum.visible` when the client
doesn't opt into invisible. Every session now carries an explicit
`mode` value. The `ShortCircuitInput.sessionMode` type tightens from
`ModeEnum | undefined` to `ModeEnum` to reflect that; two unit tests
updated to pass `ModeEnum.visible` instead of `undefined`.
