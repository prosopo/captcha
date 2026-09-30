---
"@prosopo/load-balancer": patch
---

`retryWithBackoff` now fails straight away with a clear "maxAttempts must be a positive integer" error when `maxAttempts` is 0, negative, fractional or NaN. Before, it never ran the function and threw a confusing `Error("undefined")`.
