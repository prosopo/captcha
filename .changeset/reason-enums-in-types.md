---
"@prosopo/types": minor
"@prosopo/provider": patch
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
