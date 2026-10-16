---
---

Stop a PR merging before its tests have run.

The required `check` used to be skipped on draft PRs, and GitHub counts a skipped required check as passing. A PR marked ready and merged within a few seconds was merged on the draft's skip, before the real `check` had even started. That is how https://github.com/prosopo/captcha-private/pull/5271 merged with no tests run. `check` now fails on a draft, so the merge stays blocked until the run started by "Ready for review" passes.
