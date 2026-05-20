---
"@prosopo/procaptcha": patch
---

fix/2556 reload button in image captcha mode now loads a fresh challenge
in place instead of closing the modal.

Previously `Manager.reload` called `resetState(frictionlessState?.restart)`,
which unmounted the underlying widget via the frictionless `key`-driven
restart hook (bundle path) and synchronously set `showModal: false` on the
direct path. In both cases the visible result was the same: the modal
disappeared and the user was bounced back to the checkbox. `reload` now
fires the `onReload` event, clears the challenge timeout, ensures
`loading` is false so `start()` won't no-op, and calls `start()` to fetch
a new image captcha against the existing frictionless session (if any).
