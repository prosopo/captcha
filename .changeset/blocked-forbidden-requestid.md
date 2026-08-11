---
"@prosopo/provider": patch
---

blacklistRequestInspector: return structured `{ error: { message, code } }` on
403 blocks with the requestId embedded (`Forbidden: <requestId>`), replacing
the plain-string `{ error: "Forbidden" }`. The deployed widget's error
extractor reads `result.error?.message` verbatim, so the FAQ-link banner now
shows `Forbidden: <request-uuid>` instead of falling through to the generic
"Cannot load CAPTCHA" — support can look up the blocking rule from the
requestId a user quotes. Purely a backend response shape change; the widget
already handles the structured object shape from the frictionless path.
