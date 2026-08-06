---
"@prosopo/provider": patch
---

fix(provider): session captchaType takes precedence over restrict-policy captchaType at `/captcha/{type}` gate

`isValidRequest` was rejecting `/captcha/{type}` calls whenever an active restrict-to-image rule pinned a different captchaType from the one the widget requested — even when a valid session existed that had been minted legitimately before the rule appeared. The check ran before the sessionId lookup, so any anomaly detector inserting a rule between the widget's `/frictionless` response and its `/captcha/pow` call surfaced as `INCORRECT_CAPTCHA_TYPE` (400).

Observed impact: ~150/hr fleet-wide, concentrated on pimeyes / eyematch / …RsJ2zsy39, with the `IP_CLIENT_CROSSOVER` detector as the most common trigger (24h aggregation, restrict-to-image, global clientId).

Fix: session record is authoritative for captchaType when a sessionId is present. The policy still fires at verify time via `decisionMachineRunner` + `checkForHardBlock`. Sessionless requests still enforce the policy captchaType (preserves the pre-fix behaviour for direct-entry callers).

Regression guards added to `captchaManager.unit.test.ts`:
- session's captchaType wins when a restrict policy materialises mid-flight
- session with mismatched captchaType still rejects (not the policy-race case)
- sessionless request still rejected on policy captchaType mismatch
- sessionless request with matching policy captchaType passes
