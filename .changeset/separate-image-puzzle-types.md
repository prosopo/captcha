---
"@prosopo/types": minor
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/server": patch
"@prosopo/procaptcha-frictionless": patch
---

Name the captcha-type sets and group per-challenge session settings.

`ChallengeCaptchaType` (pow | image | puzzle) and `InteractiveCaptchaType`
(image | puzzle) replace the anonymous unions that were spelled out across the
escalation path, so adding a challenge type is a compile error at each site
rather than a grep exercise. `DecisionMachineCaptchaTypeSchema` stays as an
alias for stored decision-machine artefacts.

Challenge dispatch now goes through one exhaustive table
(`sendChallenge` in the provider, `VERIFY_RECENCY` + the verifier record in
`@prosopo/server`) instead of per-type if/switch chains in the configured-type
short-circuit, the access-policy handler and the client verify path.

Sessions additionally record `challengeParams`, a discriminated view of
`solvedImagesCount` / `powDifficulty` / `blocked` keyed on the challenge type.
This is dual-written alongside the existing flat fields, which remain the
source of truth — no reader changes and no backfill is required by this
release. `ClientSettingsSchema` likewise exposes derived `image`, `pow` and
`puzzle` groups on parse while the flat keys stay authoritative.

`registerBlockedSession` now takes the captcha type the request would have
been served instead of hardcoding `image`. Blocked sessions arising from an
access rule that pins pow or puzzle are recorded against that type, matching
what the same code path already logs.
