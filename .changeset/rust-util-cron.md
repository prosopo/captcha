---
"@prosopo/util": patch
"@prosopo/provider": patch
---

The Rust port of the `cron` package's schedule parsing moved from the provider to util, gained cron 3.5.0's parsing and its `sendAt`/`getTimeout`, and splits fields on JavaScript's whitespace.
