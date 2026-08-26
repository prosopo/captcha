---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/locale": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-bundle": minor
"@prosopo/procaptcha": minor
"@prosopo/procaptcha-pow": minor
"@prosopo/procaptcha-puzzle": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-frictionless": patch
---

Correlate a site-supplied session id across render and verify.

A site can now hand the widget its own session identifier — Protect's JTI, or any per-user session id it already holds — and have the provider confirm at verify time that the token was earned in that same session. Render it with `data-sessionid="..."` or `renderOptions.sessionId`, resolved the same way `mode` and `language` already are, so implicit, explicit and invisible-button renders all pick it up. Pass the same value as the new trailing `clientSessionId` argument to `ProsopoServer.isVerified`.

The widget attaches it to the solution as `clientMetaData.clientSessionId`. It is persisted on the captcha record (PoW, puzzle and image alike) and mirrored to a new top-level `clientMetaData` key on the session record — an object rather than a flat field, because more render-time metadata is expected to land there. It survives the PoW→image/puzzle escalation handoff, since the escalated widget is mounted with the same config.

At verify, when the value is supplied and the solve does not carry exactly that value — including carrying none at all, which is what a token minted outside the site's session looks like — the token is disapproved with the new `ResultReason.CLIENT_SESSION_MISMATCH` (`API.CLIENT_SESSION_MISMATCH`, translated in all 31 locales), recorded on both the captcha record and the session.

Omitting the id preserves existing behaviour, so this is opt-in and backward compatible. The verify request field is `clientSessionId` rather than `sessionId` because `VerificationResponse.sessionId` already means the provider's own frictionless session; same-named request and response fields meaning different things would be a trap for integrators.
