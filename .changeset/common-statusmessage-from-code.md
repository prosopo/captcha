---
"@prosopo/common": patch
---

fix: derive HTTP status message from actual status code

`unwrapError` hardcoded `statusMessage = "Bad Request"` regardless of the resolved status code, so 401/403/500 responses (copied onto `response.statusMessage` by `errorHandler`) carried the wrong reason phrase. The reason phrase is now derived from the final status code via a local `STATUS_MESSAGES` map (a subset of `node:http`'s `STATUS_CODES`, kept local so this module stays browser-bundle compatible; unmapped codes fall back to a reason phrase by class — 5xx to "Internal Server Error", otherwise "Bad Request").
