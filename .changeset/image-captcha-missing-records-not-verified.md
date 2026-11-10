---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
---

Image captcha requests that point at a record that is not there now get a clean "not verified" instead of a 500 error:

- A server verify naming a commitment id that does not exist answers `verified: false` with `API.USER_NOT_VERIFIED_NO_SOLUTION`.
- Submitting a solution to an image request that was already answered (a double click or a network retry), or that never existed, answers `verified: false`.

`getPendingImageCommitment` now returns `undefined` when no pending request matches, instead of throwing.
