---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/api": patch
---

The widget now sends the behavioural readings it has already gathered with the frictionless request, not only with the solution. The provider reads them with the same detector bundle it uses at submit and stores the device readings on the session, so a phone's first puzzle gets the touch sizing instead of waiting for a solve to report the touch screen. Readings that are missing or cannot be read leave the session as it was, and never fail the request.
