---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
"@prosopo/types": patch
"@prosopo/icon-order-assets": patch
---

Review fixes for the icon-order captcha type.

The single-use guard is now a claim rather than a read. `verifyIconOrderCaptchaSolution` checked `userSubmitted` on the record it had just fetched, so concurrent submissions against one challenge all read the same unclaimed record and each came back with a verdict — which is exactly the enumeration the guard exists to stop, and it is cheap here because the answer is an ordered subset of a handful of on-screen positions. `claimIconOrderCaptchaSubmission` flips the flag under a `userSubmitted: { $ne: true }` filter, so of N concurrent submitters exactly one is graded.

`iconOrderTolerance` now tops out at 12 rather than 20. The ceiling only exists so the end-to-end specs can raise the hit radius until a scripted click anywhere on the frame counts; 12 is the smallest value that still does that, so the vacuous end of the range is as narrow as the tests allow. The derivation is on the field schema.

`@prosopo/icon-order-assets` is no longer `private`. It is a runtime dependency of `@prosopo/provider`, which is published, so leaving it unpublishable would have broken installs of the published provider. `@prosopo/puzzle-assets`, its counterpart, was already public.
