---
---

Update the Rust migration plan: the three private packages that import the provider (database-private, job-definitions and aws-serverless-api) are now planned for porting to Rust rather than kept as TypeScript, since none of them is frontend code. No npm package changes.
