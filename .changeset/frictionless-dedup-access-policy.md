---
"@prosopo/provider": patch
---

Frictionless: honour an active user access policy on the session-dedup fast path. A reused session whose captchaType conflicts with the policy — e.g. an IP rate-limit rule (`IP_HIGH_REQUEST_RATE_SIMPLE`) forcing `image` over a previously-cached `pow` session — was served as-is and then hard-rejected at the `/captcha/{type}` gate with `INCORRECT_CAPTCHA_TYPE`, breaking the widget. The dedup branch now re-checks the policy, and on conflict evicts the stale session and falls through so the access policy (or decision machine) selects the correct captcha type.
