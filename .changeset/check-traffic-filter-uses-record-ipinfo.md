---
"@prosopo/provider": patch
"@prosopo/database": patch
---

Stop re-looking up the IP in `checkTrafficFilter` — read `record.ipInfo` instead

Now that every captcha record carries the full `IPInfoResponse` (written by `ipInfoMiddleware` at request time), `checkTrafficFilter` no longer needs to call `ipInfoService.lookup(ip)` on the verify path. The function takes an `IPInfoResponse | undefined` directly and is no longer async — one fewer sidecar round-trip per verify call.

- `checkTrafficFilter(ip, trafficFilter, ipInfoService, logger)` → `checkTrafficFilter(ipInfo, trafficFilter)`.
- `serverVerifyPowCaptchaSolution`, `verifyImageCaptchaSolution`, and `serverVerifyPuzzleCaptchaSolution` (newly given a `trafficFilter` parameter to bring it to parity with the other two) read `challengeRecord.ipInfo` / `solution.ipInfo` by default, and only do a fresh `env.ipInfoService.lookup(ip)` when the dapp passed up the end user's current IP via the verify call — that's the "now" IP for filtering, and may differ from the IP that originally requested the captcha.
- Existing unit tests (`checkTrafficFilter.unit.test.ts`) updated to the new shape; new MongoMemory roundtrip tests in `packages/database/src/tests/integration/ipInfoPersistence.integration.test.ts` prove the three captcha schemas (PoW / Puzzle / UserCommitment) actually persist + retrieve a full IPInfoResponse, and that the `{ ipInfo: { $exists: false } }` backfill query matches records missing the field.

Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
