---
"@prosopo/types": patch
"@prosopo/provider": patch
---

feat(provider): relax captcha-flow rate limits 5x and log 429s

- Default rate limits for the captcha-flow endpoints (get/submit image, PoW, frictionless and puzzle challenges, plus the verify endpoints) are now 5x more permissive. The previous defaults were rate limiting legitimate widget traffic.
- The provider now logs a warning whenever a request is rejected with a 429, including the path, IP and site key, so operators can alarm on sustained rate limiting.
