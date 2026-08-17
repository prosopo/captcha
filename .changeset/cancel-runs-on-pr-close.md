---
---

Add a `cancel-runs-on-pr-close` workflow. When a PR is merged (or closed) its still-running workflows are cancelled, so runs that nobody will read stop billing minutes and stop occupying runners other PRs are queueing for. Only runs that were already in flight while the PR was open are cancelled -- anything created after the close, such as release automation, is left alone.
