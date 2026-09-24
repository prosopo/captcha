---
"@prosopo/procaptcha-frictionless": patch
---

Removing or resetting a frictionless widget while its bot-detection request is still running no longer lets that request finish the job. Before, a detection that came back after the widget was gone could still mount the Web Bot Auth badge and call `onHuman` with a token, call `onError`, keep retrying against other providers, or schedule a restart timer that nothing could cancel and that later called `onReset`. The widget now stops as soon as it is destroyed.
