---
"@prosopo/database": patch
---

Extend `getDappUserCommitmentById` and `getDappUserCommitmentByAccount` projections to include every field the DM input builder in `verifyImageCaptchaSolution` reads from the returned solution — `behavioralDataPacked`, `deviceCapability`, `coords`, plus (for the by-account fallback) `userAccount`, `dappAccount`, `headers`, `ipInfo`, `sessionId`, `serverChecked`, `ipAddress`, `submittedAtTimestamp`. Both methods now share `DAPP_USER_COMMITMENT_PROJECTION`.

Symptom: legit user captcha submissions that carried `cache-control: no-cache` (browsers with DevTools "Disable cache" enabled) were disapproved with `no-cache request with no behavioural data`, even when the record on disk carried ~50 real c1 + c3 events. The Twickets `/32 challenge` access-rule + captcha flow loop for a specific operator IP surfaced this on 2026-08-24, but the underlying bug affects every DM on the img verify path.

Root cause: same class as #3107 (`getSessionRecordBySessionId` missing tcp-probe fields). `getDappUserCommitmentById` had a 13-field projection that omitted `behavioralDataPacked`, `deviceCapability`, and `coords`. `getDappUserCommitmentByAccount` (the fallback path when the caller doesn't have a commitmentId) projected only `{_id: 0, result: 1}`, so on that branch every DM input field beyond `result` landed as `undefined`. `noCacheNoBdpRule` then denied on any no-cache POST because `hasBehaviouralData(undefined) === false`; every other BDP-, headers-, or ipInfo-reading rule silently returned `null`.

Guard: adds `commitmentRecordProjection.integration.test.ts` — persists a full commitment (BDP + coords + deviceCapability + ipInfo + headers), fetches via both methods, asserts each DM-input field round-trips and that both methods return the same shape.
