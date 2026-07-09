---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/provider": patch
"@prosopo/api": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Record both the top-frame URL and the widget's own iframe URL on frictionless sessions.

Previously the client only sent one field (`currentUrl`), which for embedded widgets resolved to the top-frame URL — so we lost visibility into which iframe endpoint the session was actually loaded through. Now the client sends both:

- `currentUrl`: the top-frame URL (same resolution rules as before — same-origin iframes read `window.top.location.href` directly; cross-origin iframes fall back to `document.referrer`).
- `iframeUrl`: the widget's own frame URL when embedded. Undefined when the widget IS the top frame (nothing to distinguish).

Both fields are sanitised client- and server-side (origin + path only; query string, fragment and any embedded credentials stripped). The provider persists both on the `Session` record and re-uses them on post-PoW escalation sessions. Only `currentUrl` is gated in the decision machine (unchanged — missing `currentUrl` still forces an image captcha); `iframeUrl` is recorded for analytics.
