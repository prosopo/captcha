---
"@prosopo/provider": patch
---

When a dataset is loaded, a captcha with an empty solution now counts as unsolved in the checks for enough solved and unsolved captchas. Parsing fills a missing solution with `[]`, which counted as solved, so the solved check always passed and the unsolved check failed whenever unsolved captchas were required. Storing the dataset already treated an empty solution as unsolved; the checks now agree with it.
