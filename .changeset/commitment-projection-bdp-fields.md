---
"@prosopo/database": patch
---

Extend `getDappUserCommitmentById` and `getDappUserCommitmentByAccount` projections to include every field the DM input builder in `verifyImageCaptchaSolution` reads from the returned solution — `behavioralDataPacked`, `deviceCapability`, `coords`, plus (for the by-account fallback) `userAccount`, `dappAccount`, `headers`, `ipInfo`, `sessionId`, `serverChecked`, `ipAddress`, `submittedAtTimestamp`. Both methods now share `DAPP_USER_COMMITMENT_PROJECTION`.

Symptom: legit user captcha submissions that carried `cache-control: no-cache` (e.g. browsers with DevTools "Disable cache" enabled) were disapproved with `no-cache request with no behavioural data`, even when the record on disk carried real behavioural events.

Root cause: same class as #3107 (`getSessionRecordBySessionId` missing tcp-probe fields). `getDappUserCommitmentById` had a 13-field projection that omitted `behavioralDataPacked`, `deviceCapability`, and `coords`. `getDappUserCommitmentByAccount` projected only `{_id: 0, result: 1}`, so on that branch every DM input field beyond `result` landed as `undefined`. BDP-reading decide rules silently returned null; any guard that combined a header check with "no BDP present" denied on every no-cache POST regardless of the on-disk payload.

Guard: adds `commitmentRecordProjection.integration.test.ts` — persists a full commitment (BDP + coords + deviceCapability + ipInfo + headers), fetches via both methods, asserts each DM-input field round-trips and that both methods return the same shape.
