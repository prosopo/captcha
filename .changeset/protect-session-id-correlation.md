---
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/api": minor
---

Correlate captcha sessions with Prosopo Protect sessions on sites that run both.

Protect's challenge page already renders the widget with `data-sessionid=<its session id>`, so captchas served from the interstitial can be matched back to the Protect session. A widget the site embeds itself — on its own pages — had no way to know that id, so those sessions could not be matched to anything.

The widget now falls back to reading Protect's session id from the page (`window.prosopo_protect.jti`, or the `prosopo_session` cookie Protect sets on the site's domain) when the site has not supplied a session id of its own. A session id the site does supply always wins, so nothing changes for sites that use the field themselves, and sites without Protect are unaffected. Only the id is read — the session token that shares the cookie never leaves the page.

Two gaps in the existing field are closed alongside it: the widget now sends the session id when it first asks for a captcha rather than only when submitting a solution, and the provider records it on the session at that point. Previously a session that was allowed without a challenge, or abandoned before the user solved one, carried no session id at all. An escalated session now inherits the id from the session it escalated from.
