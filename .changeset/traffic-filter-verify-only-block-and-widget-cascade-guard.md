---
"@prosopo/provider": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/cli": patch
---

Two related fixes for the residual `INCORRECT_CAPTCHA_TYPE` class of
400s on frictionless-configured sitekeys.

**Server — request-time trafficFilter no longer blocks.** Move `block`
enforcement back to submit / verify time (via
`resolveTrafficFilterCheck` in the PoW / image / puzzle task classes).
`applyTrafficFilterAtRequestTime` now returns only `pass` or
`challenge` — a `challenge` match still overrides captchaType /
powDifficulty / solvedImagesCount / puzzleTolerance at request time,
but a `block` match never short-circuits with 401. This restores the
pre-#3045 behaviour that blocked interactions still complete a solve
so they bill. Without this the operator's own trafficFilter policies
became widget-mount failures that cascaded into
`INCORRECT_CAPTCHA_TYPE` (~865/hr fleet-wide, concentrated on a
handful of sitekeys whose trafficFilter blocks datacenter / proxy).

**Widget — defensive guard for malformed `/frictionless` responses.**
Extract `evaluateFrictionlessResult` in `procaptcha-frictionless` and
halt when the response carries no `captchaType`. The previous flow
fell through into a default `ProcaptchaPow` mount with an undefined
`sessionId` on any bare-string 401 body (`{ "error": "Unauthorized" }`)
— the shape emitted by access-policy hard-block, decision-machine
autoBan, and domain / header middleware. `HttpClientBase` does not
throw on 4xx JSON so the widget receives these as valid-looking
`GetFrictionlessCaptchaResponse` and its `error.message` check misses.
The provider then rejects the fall-through `/captcha/pow` call as
`INCORRECT_CAPTCHA_TYPE` because the sitekey is
frictionless-configured.

**Rate-limits config fix.** Adds the missing `AdminApiPaths.GetSession`
entry to `getRateLimitConfig()` in `@prosopo/cli` — introduced
alongside the `/admin/session/get` diagnostic endpoint but never wired
into the CLI's rate-limit table, which broke `npm run setup` under
`ProsopoConfigSchema.parse`.

Unit and integration coverage: request-time `block` matches now
assert `pass` in `trafficFilterHierarchy.integration.test.ts` and
`trafficFilterRequestTime.unit.test.ts`; new unit coverage on
`captchaManager.resolveTrafficFilterCheck` locks in that datacenter
`block` still fires at verify (billing intact), datacenter `challenge`
doesn't (it's a request-time concern only), and the abuser default
still applies at verify for unconfigured sites. New
`evaluateFrictionlessResult` unit tests exercise the widget guard, and
a `frictionlessNoCaptchaTypeCascade.cy.ts` cypress spec forces the
bare-string 401 via `cy.intercept` and asserts no `/captcha/pow`
follows.
