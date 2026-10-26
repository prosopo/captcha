---
---

Remove the stale-pr-to-draft workflow. Turning a PR back into a draft after a day without updates adds nothing.

It was also spamming PRs. It posted its "converted to draft" comment first, then tried the conversion, which has failed every time with `Resource not accessible by integration`. So no PR was ever drafted, but every run left a comment. That comment counted as an update, so 24 hours later the same PR looked stale again and got another one. #3156 collected 22.
