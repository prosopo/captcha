---
"@prosopo/provider": patch
---

Regenerate the obfuscated payload decoder so it matches the payload the
detector now produces.

The decoder ships as a pre-built file rather than being compiled from source
here, so it did not pick up the payload format change that landed alongside the
detector data bag. It still expected the old fixed field count, and rejected
every payload written in the new format — the provider then treated a perfectly
good detection result as an unreadable one and fell back to a challenge.
