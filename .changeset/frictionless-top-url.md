---
"@prosopo/procaptcha-frictionless": patch
---

Report the top-frame URL as `currentUrl` when the widget runs inside an iframe.

Previously the frictionless client always sent `window.location.origin + pathname`, which is the iframe's own URL — so every session loaded through Protect's site-wide iframe (`protect.<tenant>.live/...`) reported the same widget endpoint regardless of which page the user was actually on. Downstream detectors (HEAD_HASH_OUTLIER's proxy-pool signal in particular) then saw diverse-geography traffic on one URL+UA fingerprint and treated our own iframe as a bot cluster.

Resolution order for `currentUrl`:
1. Top window → local `location.href` (widget is the top frame).
2. Same-origin iframe → `window.top.location.href`.
3. Cross-origin iframe → `document.referrer` (browser fills it subject to Referrer-Policy).
4. Fallback → the iframe's own `location.href` so the field is never empty.

Origin+path sanitisation is preserved across all paths — the query string, fragment and any embedded credentials are still stripped before the URL leaves the browser.
