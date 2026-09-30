---
"@prosopo/provider": patch
---

Check the number of unsolved captchas in a dataset against the configured minimum, instead of checking the number of solved ones twice.

The unsolved check compared the solved count with `unsolved.count`, so a dataset where every captcha was solved passed even when unsolved captchas were required. It now counts the captchas without a solution. Production sets `unsolved.count` to 0, so its behaviour does not change.
