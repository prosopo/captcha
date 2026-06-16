---
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

perf(provider): cut p95 on /captcha/frictionless and /captcha/image

Replaces the `$match → $sample` random-captcha lookup with an indexed
range scan over a new `{datasetId, solved, randomKey}` compound index;
reorders the `sampleContextEntropy` aggregation so `$sample` runs
before `$lookup`; batches three pairs of independent awaits in the
frictionless handler via `Promise.all`. Adds an integration test
asserting via `.explain()` and wall-clock timing that the new paths
are quantifiably faster. The legacy aggregation remains as a fallback
in `getRandomCaptcha` so deployment can precede the
providerBackfillCaptchaRandomKey rollout.
