---
"@prosopo/provider": patch
---

Fix `/captcha/{type}` endpoints looping with "No session found" after a
session has been consumed: the hash → sessionId mapping
(`cache:session:hash:{userSitekeyIpHash}`) is now invalidated alongside
the sessionId cache, and both invalidations are awaited so a concurrent
`patchCachedSession` (e.g. puzzle solution submission) can no longer
re-populate the cache between consume and response. Previously the
hash mapping outlived the session for up to its 1-hour TTL, so
`/frictionless` kept handing the dead sessionId back to the client.

Fix the configured-image short-circuit in `/frictionless` to use the
normal solved count capped by `imageMaxRounds`, matching every other
image branch in the file. Previously it used `imageMaxRounds`
(default 32) as the count rather than as a cap, so any site key
configured with `captchaType: image` punished every visitor with 32
rounds regardless of bot signals.
