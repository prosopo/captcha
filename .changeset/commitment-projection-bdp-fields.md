---
"@prosopo/database": patch
---

Extend `getDappUserCommitmentById` and `getDappUserCommitmentByAccount` projections to include every field that the downstream verify path (`verifyImageCaptchaSolution`) reads off the returned solution — `behavioralDataPacked`, `deviceCapability`, `coords`, plus (for the by-account fallback) `userAccount`, `dappAccount`, `headers`, `ipInfo`, `sessionId`, `serverChecked`, `ipAddress`, `submittedAtTimestamp`. Both methods now share `DAPP_USER_COMMITMENT_PROJECTION`.

Root cause: same class as #3107 (`getSessionRecordBySessionId` missing tcp-probe fields). `getDappUserCommitmentById` had a 13-field projection that omitted `behavioralDataPacked`, `deviceCapability`, and `coords`. `getDappUserCommitmentByAccount` projected only `{_id: 0, result: 1}`, so on that branch every field beyond `result` landed as `undefined` at the caller. Any downstream code path that read a stripped field silently degraded.

Guard: adds `commitmentRecordProjection.integration.test.ts` — persists a full commitment, fetches via both methods, asserts each field the verify path reads round-trips and that both methods return the same shape.
