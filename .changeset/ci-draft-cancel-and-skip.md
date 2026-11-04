---
---

CI: moving a pull request to draft now cancels its running checks and skips them while it stays a draft; marking it ready for review runs them again. Applied to every pull-request check workflow that was missing part of this.

Non-draft PRs with no updates for a day are now converted to draft every 6 hours, unless they have auto-merge on, are approved, or carry the `keep-ready` label. The conversion runs as the bot user so it actually cancels their running checks.
