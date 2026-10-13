---
"@prosopo/procaptcha-pow": patch
---

On a slow device the proof-of-work can take longer than the provider's one-minute window, and the provider then rejects it. The widget reported that as a failed captcha. It now reports it as an expired challenge, which shows the "captcha solution has expired" message, and resets so the user can tick the box again for a new challenge.
