---
"@prosopo/types": minor
"@prosopo/provider": patch
"@prosopo/database": patch
---

Move `FrictionlessReason` into `@prosopo/types` and add a new
`ResultReason` enum covering the values previously inlined as string
literals on `result.reason` (API.CAPTCHA_PASSED, API.VPN_BLOCKED,
EMAIL_INVALID, etc.). Provider task code now references the enums so the
canonical list of selection/result reasons lives in one place and can be
imported by non-server packages (portal, audit tooling) without pulling
in `@prosopo/provider`. The previous `FrictionlessReason` export from
`@prosopo/provider` is preserved as a re-export for backwards
compatibility.

`CaptchaResult.reason`, `StoredCaptcha.result.reason`, `Session.result.reason`
are now typed `ResultReason | undefined`; `Session.reason` is typed
`FrictionlessReason | undefined`. The runtime zod schema stays permissive
(`string().optional().transform(v => v as ResultReason | undefined)`) so
operator-authored decision-machine output and old MongoDB records still
parse without throwing; the strict enum is preserved on the TS surface
via the transform.
