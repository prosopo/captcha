---
"@prosopo/procaptcha-bundle": patch
---

Calling `procaptcha.reset()` again while a reset was still rebuilding the widget (for example from an error callback and a user click at the same time) left one replacement widget running but untracked, so `remove()` could never reach it. Overlapping resets of the same widget now share one rebuild, and a replacement that finishes after `remove()` is torn down instead of coming back.
