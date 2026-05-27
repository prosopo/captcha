---
"@prosopo/provider": patch
"@prosopo/types": patch
---

feat(provider): add `autoBanScoreThreshold` client setting and frictionless auto-ban

Adds an optional `autoBanScoreThreshold` to `ClientSettingsSchema`. When set,
the frictionless decision machine blocks any request whose detector score is
at or above the threshold with HTTP 401 instead of issuing an image or PoW
challenge — useful for clients receiving floods of image solves from sessions
scoring at or above 1.

The check runs first in `runDecisionMachine`, before the existing
user-agent / context-aware / webview / timestamp / threshold gates, so score
bumps applied by those gates cannot bypass it. Blocked sessions are persisted
via `registerBlockedSession` with the new `FrictionlessReason.AUTO_BAN_SCORE`
reason.

Undefined threshold = disabled; existing clients are unaffected.
