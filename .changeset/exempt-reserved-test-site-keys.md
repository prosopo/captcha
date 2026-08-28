---
"@prosopo/provider": patch
---

Make the reserved test site keys usable end to end.

They were honoured in some places and rejected in others, so a reserved key could not complete a flow. Two gaps are closed.

`blockMiddleware` is mounted ahead of `domainMiddleware` and decides purely on IP/JA4/ASN, so it never saw the site key and a reserved key was refused before any site-key logic ran. It now skips access-rule evaluation for reserved keys. This only skips access-rule evaluation: the keys already force a deterministic verdict, and a token is bound to the reserved key it was issued under, so one cannot clear a captcha on a site protected by a real key.

The challenge issuers — `getPoWCaptchaChallenge`, `getPuzzleCaptchaChallenge` and `getImageCaptchaChallenge` — each fetched a client record and rejected with `SITE_KEY_NOT_REGISTERED` when it was missing, which reserved keys have no reason to have. That broke the path the frictionless handler sets up, since it hands a reserved key an invisible PoW session whose next call is `getPowCaptchaChallenge`. Each now serves the existing dummy response, guarded directly after the maintenance-mode short-circuit it mirrors.

Routing and decision machines needed no equivalent: `applyRoutingMachine` and `runDecisionMachine` are reached only from the frictionless handler, after its reserved-key early return.
