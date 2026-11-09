---
"@prosopo/web-bot-auth": patch
---

`verifyWebBotAuth` now returns a failure reason instead of throwing in two cases: a `Signature-Agent` header whose URL cannot be parsed (`unparseable-signature-agent`), and a key directory that lists a `null` or non-object entry before the matching key (such entries are now skipped). Both come from outside, so they should be ordinary verification failures like every other bad input.
