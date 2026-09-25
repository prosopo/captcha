---
"@prosopo/database": patch
---

Updating an image captcha commitment now moves its `lastUpdatedTimestamp` forward. The field name was misspelt, so the timestamp never changed. The central-store sweep uses that timestamp to decide whether a record changed after it read it. Because of the misspelling, a `providedIp` or email written while the sweep was running could be marked as stored without ever reaching the central store. Pipeline-form updates also stopped writing a stray `lastUpdatedAtTimestamp` field.
