---
"@prosopo/provider": patch
"@prosopo/cypress-shared": patch
---

fix(access-policy): stop request-time rejection of Block+deferToVerify rules; expand DM cypress coverage to all captcha types

**The bug.** Block-type access policies with `deferToVerify: true` — the "solve normally, block silently at verify" pattern — were breaking every /captcha/* request instead. `sanitizeAccessPolicy` strips `captchaType` from every Block policy on write, and the captcha challenge handlers (`getImageCaptchaChallenge`, `getPoWCaptchaChallenge`, `getPuzzleCaptchaChallenge`) fetched the matching policy via `getPrioritisedAccessPolicies` (which does NOT filter out `deferToVerify: true` rules) and passed it to `captchaManager.isValidRequest` — where the `userAccessPolicy.captchaType !== requestedCaptchaType` check reduced to `undefined !== "image"` → 400 INCORRECT_CAPTCHA_TYPE. Same shape at the frictionless entry point in `handleAccessPolicy`, which would 401 instead of letting the flow complete.

**The fix.** Filter `deferToVerify` policies out at every request-time load site (mirrors what `blockMiddleware` already does), plus a defensive relaxation of the captchaType check in `isValidRequest` so a policy without a pinned captchaType no longer trips the mismatch. Unit tests added for the request-time filter and the defensive check.

**New cypress coverage.** Extended the previously-added routing / decision-machine / access-policy specs so every branch is exercised:

- `accessPolicy.cy.ts` — request-time Block (403) AND defer-to-verify Block (200 at request time, block at verify). The second `it` is the regression guard for the bug above.
- `decisionMachineDenyPow.cy.ts` + `decisionMachineDenyPuzzle.cy.ts` — decide() DM deny at verify for pow and puzzle (image was already covered). Each captcha task calls decisionMachineRunner.decide() separately, so per-type specs guard against a single verify path dropping the deny hook.
- `routingFrictionless.cy.ts` — added the pow branch (baseline pass-through) so all three captcha types are covered end-to-end.
