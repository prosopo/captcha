---
"@prosopo/database": patch
"@prosopo/types-database": patch
---

Records copied to the central captcha store no longer carry the provider's `storedAtTimestamp`. The central store's `storedAtTimestamp` TTL index is now one year; provider stores keep four weeks.
