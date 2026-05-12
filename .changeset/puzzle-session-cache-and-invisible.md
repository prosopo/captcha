---
"@prosopo/provider": patch
"@prosopo/procaptcha-puzzle": minor
"@prosopo/client-bundle-example": patch
---

Fix `/captcha/{type}` endpoints looping with "No session found" when the
Redis session cache and Mongo diverge: on a session lookup miss the cache
entry is now invalidated, so the next `/frictionless` falls through and
creates a fresh session instead of resurrecting the dead one.

Add invisible-mode support to the puzzle captcha widget: the
execute-event handler now drives the full phase transition
(`start` → `setChallengeData` → `dragging`), and the puzzle overlay is
rendered in invisible mode so the user can still solve the (inherently
interactive) drag challenge — only the checkbox UI is hidden.

Add `invisible-puzzle-implicit.html` / `invisible-puzzle-explicit.html`
demo pages, and surface both standard and invisible puzzle entries in
the client-bundle-example navbar.
