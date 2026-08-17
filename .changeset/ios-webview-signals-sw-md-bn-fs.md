---
"@prosopo/types": minor
"@prosopo/provider": minor
---

Ship raw iOS WKWebView DOM signals (`sw`, `md`, `bn`, `fs`) alongside the classifier verdict `isWebView`.

The four booleans that `classifyIosWebViewFromSignals` folds into `isWebView` are now decrypted off the client payload (positions 14-17) and surfaced individually on `DetectorResult` and in the "decryptPayload result" info log. Short-acronym keys match the existing `g`/`i` wire convention. Backwards-compatible: `isWebView` at position 4 is untouched; older catcher clients that don't emit positions 14-17 log the fields as `undefined`.

Motivation: real iOS 17.7.x devices appear to expose one or more of these APIs even on stock WKWebView (unlike the iOS 18 Simulator the classifier was audited against), collapsing iOS Twickets `webView:true` from 97.6% to 0.2% post-v3.7.8. Shipping the raw signals lets server-side rules retune the aggregation from live traffic in OpenObserve without a catcher release.

Note: `decodePayload.js` (obfuscated production build) still needs to be rebuilt to parse positions 14-17 out of the delimited payload and expose them as `result.sw`/`result.md`/`result.bn`/`result.fs`. Until that ships, the fields log as `undefined`.
