---
"@prosopo/types": patch
"@prosopo/api": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/provider": patch
"@prosopo/config": patch
"@prosopo/logger": patch
---

Remove the client-controlled `detectorUnavailable` frictionless bypass. A client could set the flag and be handed a PoW challenge without any detection running. The flag is gone from the wire format, the API client and the widget; the only remaining bypasses are provider-side (maintenance mode, empty detector bundle pool).

The frictionless decision machine now gates on payload presence after the access-rule ladder: no token serves a 3-round image captcha, a token without its head hash serves a 2-round one.
