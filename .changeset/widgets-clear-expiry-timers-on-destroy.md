---
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
---

Removing or resetting a widget now stops its expiry timers. Before, a widget torn down after a solve (by `procaptcha.reset()`, `procaptcha.remove()` or a frictionless escalation) still fired `onExpired` two minutes later. That removed the token the replacement widget had just put into the form and reset the page's own state. The image challenge's timeout could also fire `onChallengeExpired` after the widget was gone.
