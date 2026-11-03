---
"@prosopo/cli": patch
---

`ensure_indexes` now builds the provider's indexes instead of stopping with `mongoCaptchaUri not set in config`. That check belongs to `ensure_external_indexes`, which writes to the separate captcha store; `ensure_indexes` only touches the provider's own database, so a node without a captcha store, such as every self-hosted one, could never run it.
