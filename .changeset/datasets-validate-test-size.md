---
"@prosopo/datasets": patch
---

The dataset validation test built 10000 captchas while its comment says 1000. Validation checks every captcha against every other, so 10000 took over 16 seconds and hit the test timeout. It now builds the 1000 the test describes.
