---
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/ipinfo": minor
"@prosopo/types-env": minor
---

Decision machines can now act on repeated wild guesses at an interactive captcha.

- Usage counters gain a `farMiss` kind. It is written per user account and per address when a puzzle answer lands well away from the slot, as opposed to a near miss.
- A decision machine can export `requiredCounters()`, as routing machines already can, and `requiresAccountSighting()`. At verification the provider reads what it asked for into `input.counters` and `input.accountSighting`. Anything that cannot be read is left out rather than passed as zero.
- The reputation DB client reads `reputation.shared_reason` onto `IPInfoResult.sharedReason`. `IIpInfoService` gains `accountSighting(siteKey, account)`, which reads `GET /v1/account/{siteKey}/{account}` and has no answer for an unknown account, a 404 or an error.
