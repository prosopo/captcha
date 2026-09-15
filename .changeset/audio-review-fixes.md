---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
"@prosopo/types": patch
"@prosopo/audio-assets": patch
---

Review fixes for the audio captcha type.

The audio manager now extends `InteractiveCaptchaManager` like the puzzle and icon-order managers, instead of carrying its own copy of the server-verify pipeline. The copy had already drifted: it never handed the decision machine the site's `trafficPolicies`, so the egress-sensitive TCP-stack deny rules were not gated for audio, and a successful verify did not return the linked `sessionId`.

The single-use guard is now a claim rather than a read. `verifyAudioCaptchaSolution` checked `userSubmitted` on the record it had just fetched, so concurrent submissions against one challenge all read the same unclaimed record and each came back with a verdict — cheap to enumerate when the answer is a handful of digits. `claimAudioCaptchaSubmission` flips the flag under a `userSubmitted: { $ne: true }` filter, so of N concurrent submitters exactly one is graded.

`getAudioCaptchaRecordByChallenge` now projects `clientMetaData`. Without it every server verify that sent a `clientSessionId` read the record as having no session and was rejected with `CLIENT_SESSION_MISMATCH`.

Also:

- the audio record schema reuses the shared interactive-captcha fields, so its `clientMetaData` sub-schema now matches the other types
- `CaptchaType.audio` is accepted by the decision-machine artifact schema
- reserved CI test site keys get the maintenance challenge instead of an unregistered-site error, as the other challenge routes do
- `@prosopo/audio-assets` uses `@prosopo/puzzle-assets`' PRNG rather than a copy of it
- `ProviderApiInterface.submitAudioCaptchaVerify` declares the `clientSessionId` its implementation already accepted
