---
"@prosopo/common": patch
---

API error responses and error logs now carry at most 10 validation issues, plus the total count in the log. A body under the 1MB limit can fail validation with one issue per array element. For example, 150,000 `null` puzzle events give 150,000 issues. Every issue went into the 400 response and into the error log, so a 900KB request produced a 20MB response and a multi-MB log line. Both were built on the event loop, which stalled every other request on the provider while it ran.
