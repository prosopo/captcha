---
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
---

Stop two stale-state bugs in the challenge widgets.

- The image, PoW and puzzle widgets no longer call the site's success or failure callback when a solve comes back after the widget was destroyed.
- Resetting the image widget now clears the earlier solve's two-minute expiry timer, so it can no longer fire `expired` against the new session.
