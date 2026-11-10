---
"@prosopo/database": patch
"@prosopo/types-database": patch
---

Importing `@prosopo/database` no longer prints `[Function: makeDirectory]` to the console at start-up, and the unused `make-dir` dependency is gone.

Two provider database methods that nothing called are removed. `updateCaptcha` overwrote the first captcha it found in the dataset rather than the one passed to it. `flagProcessedDappUserCommitments` set a field the commitment schema does not have, so it never changed anything.
