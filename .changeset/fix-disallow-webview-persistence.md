---
"@prosopo/types": patch
"@prosopo/locale": patch
"@prosopo/provider": patch
---

fix(provider): persist DISALLOWED_WEBVIEW outcome and broaden detection in image captcha verify

The webview check in `verifyImageCaptchaSolution` did an early return that
left the commitment stuck at `Approved` in the database and never marked
the session as `serverChecked` / `disapproved`, even though the API
correctly returned `verified: false`. This made the DB state misleading
and broke any downstream consumer reading commitment status directly.

The check also only fired when `scoreComponents.webView > 0`, which is
only set when the frictionless flow took the webview branch. Webview
users who reached the image captcha via another branch (UA mismatch,
context-aware failure, timestamp, bot score) had `session.webView: true`
but no `scoreComponents.webView`, so the verify-time block missed them.

- Convert the early return to the same `failStatus` /
  `commitmentUpdates.result` pattern used by every other check in the
  function, so the commitment and session are properly persisted as
  disapproved with reason `DISALLOWED_WEBVIEW`.
- Trigger on `session.webView === true` OR `scoreComponents.webView > 0`.
- Add `ResultReason.DISALLOWED_WEBVIEW` and the English locale entry.
- Add unit tests for score-based detection, boolean-only detection, and
  the `disallowWebView=false` passthrough.

Closes #3396.
