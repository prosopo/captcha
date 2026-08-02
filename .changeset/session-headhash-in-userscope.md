---
"@prosopo/provider": patch
---

Populate `userScope.headHash` from the frictionless session record in the three captcha-challenge endpoints (`getPoWCaptchaChallenge`, `getImageCaptchaChallenge`, `getPuzzleCaptchaChallenge`). Previously all three hardcoded `undefined` for the headHash slot, so access-policy rules keyed on `headHash` could only take effect at server-verify time — after the challenge was already issued at the client-configured type / difficulty. With `sessionId` in hand each endpoint now does one indexed `getSessionRecordBySessionId` lookup and forwards `sessionRecord?.decryptedHeadHash` into `getRequestUserScope`, so headHash rules can restrict or adjust the challenge at issuance. No change when the request omits `sessionId` (direct-pow etc.).
