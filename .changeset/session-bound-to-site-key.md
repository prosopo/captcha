---
"@prosopo/provider": patch
---

A frictionless session can now only be used by the site it was issued for. Before, a session created on one site, for example one set up for easy PoW, could be passed with a request for a different site and the provider would issue the captcha type and difficulty chosen for the first site. The provider now refuses the session when its site key does not match the site asking for a captcha, with the same "no session found" answer it gives for an unknown session.
