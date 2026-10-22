---
"@prosopo/provider": patch
---

Add a Rust port of the cron schedule evaluator the provider's schedulers use, matching the `cron` package's parsing and next-run times. Checked against the package itself. The TypeScript is unchanged.
