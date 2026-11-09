---
"@prosopo/provider": patch
---

Server verification of a PoW or puzzle token whose challenge was never approved now answers `verified: false` instead of a 500 error. Before, the user failing the captcha looked like a provider outage, and integrations that retry on 5xx kept retrying.

A verify whose score is exactly 0 now includes `score: 0` for tiers that receive scores. Before, the PoW, puzzle and image verify paths dropped a score of 0, so the cleanest sessions came back with no score at all.
