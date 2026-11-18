---
"@prosopo/provider": patch
---

Authenticated tokens, minted when an Allow access rule matches, now treat the forwarded IP the same way as pow, image and puzzle tokens. The IP is optional at `/client/authenticated/verify` and is only compared with the issuing IP when the site has IP validation enabled, using that site's rules. Before, the IP was required and had to match exactly whatever the site's settings were. An integration that verified every other token type without problems was rejected as soon as one of its Allow rules matched, and the widget showed "Trusted request" on a form that could not be submitted. A rejected verify on this route is now logged with its status.
