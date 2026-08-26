---
"@prosopo/database": patch
"@prosopo/client-example-server": patch
"@prosopo/cypress-shared": patch
---

Fix client session id correlation rejecting every token.

#3139 added `clientMetaData.clientSessionId` and a verify-time check that the solve carries the same session id the widget was rendered with. The check never passed: `getPowCaptchaRecordByChallenge` and `getPuzzleCaptchaRecordByChallenge` project an explicit field list, and `clientMetaData` was not in it. The verify path therefore read `undefined` and `isClientSessionMismatch(suppliedId, undefined)` returned true for *every* token carrying a session id, disapproving it with `API.CLIENT_SESSION_MISMATCH`.

Nothing else was wrong: the widget attached the id, the wire format carried it, and the write path persisted it (the session record — read without a projection — had it all along). Only the read dropped it, which is why unit tests over the comparison helper and the escalation handoff all passed. `getSessionRecordBySessionId` had the same omission and is fixed too.

This is the third instance of this class of bug — the projection-contract helper's own docstring already cites #3107 and #3116. The guard existed but its `consumerReads` manifest was not updated when #3139 started reading a new field, so the manifests for the PoW and puzzle contracts now list `clientMetaData` and their fixtures populate it. Reverting the projection fix makes that test fail with "serverVerifyPowCaptchaSolution reads a field that the projection stripped: clientMetaData".

Adds an end-to-end Cypress spec (`clientSessionId.cy.ts`) that solves a real PoW captcha rendered with `data-sessionid` and asserts the dapp server's verify succeeds, plus a mismatch case that must be rejected — the half that proves the correlation actually runs rather than being silently skipped. This required wiring `clientSessionId` through the demo server's `/signup` into `isVerified`, which #3139 left unwired; that omission is why no e2e covered the feature.
