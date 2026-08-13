---
"@prosopo/provider": patch
---

Fix a data-loss bug where puzzle captcha submissions could drop their raw
mouse-trail (`puzzleEvents`) and get wrongly denied for it. When a solve
carried an encrypted behavioural payload but the provider couldn't decrypt
it — most commonly because the session's detector-pool bundle wasn't
resolvable (Redis binding expired, `bundleId` never promoted onto the session
record, or the bundle rotated out of the process) — the entire persistence
block was skipped. The record kept its default empty `puzzleEvents` array and
no `behavioralDataPacked`, and the global `checkNoCacheNoBehavioural` rule
then denied the submission with "no-cache request with no behavioural data"
against otherwise legitimate desktop browsers that send `cache-control:
no-cache` on hard reloads or with devtools cache disabled.

`puzzleEvents` are now persisted unconditionally up front, so the raw event
trail survives independently of whether the behavioural blob can be decrypted.
The decrypt attempt still runs and its output is still written when it
succeeds; its failure no longer takes the event trail with it.
