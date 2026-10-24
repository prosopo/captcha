---
"@prosopo/provider": patch
---

An image challenge request now has its captcha type checked before its `datasetId`. Since 3.9.1 the unknown-dataset check (`INVALID_REQUEST:PROV-94`) ran first, so a site key that serves another captcha type got "Unknown dataset" instead of `INCORRECT_CAPTCHA_TYPE` whenever it sent an unknown `datasetId`. That broke the demo monitor, which uses exactly that answer to tell which captcha type a key serves, and it has reported every demo as broken since the 3.9.1 deploy.
