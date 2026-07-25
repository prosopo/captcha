---
"@prosopo/load-balancer": patch
---

fix(load-balancer): retry healthz with exponential backoff and stop falling back to the load-balanced hostname

`resolvePinnedUrl` previously swallowed any healthz failure (network error, non-2xx, malformed body) and returned the load-balanced hostname (`pronode.prosopo.io`). That hostname isn't a registered on-chain provider, so the verify path rejected every token minted through this fallback with `Provider not found`. The tab-scoped promise cache made it worse: one healthz blip at page load poisoned every subsequent captcha attempt in that tab.

Now:

- Healthz is retried with full-jitter exponential backoff (3 attempts total, 250ms/500ms base, 2s cap) before surfacing the error.
- On terminal failure the pin cache entry is evicted and the error is thrown, so `providerRetry` in `@prosopo/procaptcha-common` can fall through to `getRandomProviderFromList` (which picks a specific on-chain provider and bypasses healthz entirely).
- Extracted a small `retryWithBackoff` helper in the same package for the backoff maths.
