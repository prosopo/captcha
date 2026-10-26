---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/api": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-frictionless": minor
---

Record the fingerprint summary, and with it the device bucket, for every captcha type rather than only PoW.

The proof of fingerprint was only built by the PoW widget and only read when a PoW solution was submitted, so sessions served a puzzle or an image never had a bucket. About half of puzzle drags could only be given one by finding a PoW the same account had solved.

The widget now sends the proof with the frictionless request, best-effort and capped at a second so it never delays the captcha. The provider verifies and summarises it once, stores the summary on the session, and the PoW, puzzle and image records copy it from there. Escalation sessions inherit it. A proof sent with a PoW solution still replaces the one from the frictionless request.

The summary is only recorded at the frictionless step, not passed to the routing machine there, so existing `deviceBucket` counter rules keep firing where they did before.
