---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

Drop flat `countryCode` / `geolocation` fields from Session records — persist the full `IPInfoResponse` payload as `session.ipInfo` instead

Brings sessions in line with captcha records (PoW / Puzzle / UserCommitment), which already store the full payload. The provider's `ipInfoMiddleware` populates `req.ipInfo` at session-creation time; that whole payload now lives on the session, so consumers narrow on `session.ipInfo?.isValid` and read whichever sub-field they need (countryCode, isVPN, isMobile, isTor, ...).

- `Session` interface + `SessionSchema` zod (`@prosopo/types`): replace `countryCode?: string` / `geolocation?: string` with `ipInfo?: IPInfoResponse`.
- `SessionRecordSchema` mongoose (`@prosopo/types-database`): same.
- `FrictionlessManager.setSessionParams` / `createSession`: accept `ipInfo` instead of `countryCode`.
- `getFrictionlessCaptchaChallenge.ts` call sites (10 of them — `sendImageCaptcha`, `sendPowCaptcha`, `registerBlockedSession`, etc.) pass `req.ipInfo` instead of `countryCode`.
- `CaptchaManager.isValidRequest()` return: drop dead `countryCode: sessionRecord.countryCode` field (no caller was destructuring it after the earlier refactor), surface `ipInfo: sessionRecord.ipInfo` instead for callers that want it.
- Two new MongoMemory roundtrip tests in `ipInfoPersistence.integration.test.ts` cover Session.ipInfo (valid response + error response). `routingDecisionMachines.integration.test.ts` fixture updated to write the full payload.

`RoutingContext.countryCode` is unchanged — that's a transient runtime struct fed into the routing machine, not a stored record. Callers of `setRoutingContext` already derive `countryCode` from `req.ipInfo.countryCode` at the API boundary.

Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
