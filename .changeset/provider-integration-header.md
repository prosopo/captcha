---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/api-express-router": patch
"@prosopo/provider": patch
---

The provider accepts an `x-prosopo-integration` request header, which names the platform that embedded the widget (e.g. `mc4wp`). It is saved on the session with the other request headers and added to the provider's request logs as `integration`. The widget does not send it yet; this has to be deployed to providers first, because browsers block a header the provider does not allow.
