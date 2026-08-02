---
"@prosopo/procaptcha": patch
---

Add unit and type tests for the image captcha manager, the provider adapter and the behavioural collector (140 tests, 100% statement/branch/function/line coverage).

Two edge cases surfaced and fixed while covering `ProsopoCaptchaApi`/`Manager`:

- `submitCaptchaSolution` overflowed the stack on an empty solution set: `CaptchaMerkleTree` recurses on an empty layer, so the existing `!tree.root` guard never ran. Empty solution sets are now rejected up front.
- `loadProviderApi` proved the site key was set but its callers still fell back to `""` when constructing `ProsopoCaptchaApi`, so a missing site key could have been forwarded as an empty dapp account. It now returns the validated site key alongside the client.

No behavioural changes to the captcha flow itself.
