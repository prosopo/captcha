---
"@prosopo/provider": patch
---

Pad the challenge on the two frictionless paths that return early: a reused session, and a site pinned to a concrete captcha type.

`applyTrafficFilterAtRequestTime` ran after both short-circuits, so neither resolved a verdict and neither response was padded. On a site whose traffic is mostly returning visitors that is most of the traffic — on Twickets, session reuse is 11–18% of decisions and rose to ~16% after their proxy pool consolidated onto fewer IPs.

The verdict now resolves once, before both, and the pad is attached from it. No extra work: the call is synchronous and reads `req.ipInfo`, which `ipInfoMiddleware` already populates for every request.

The pad is read live on every request rather than stored on the session, unlike `captchaType`, `powDifficulty` and `puzzleTolerance`. Those are frozen because they are part of the issued challenge — the PoW string was minted at that difficulty — so re-deriving them mid-session would invalidate work already handed out. Nothing verifies the pad, so it has no such constraint, and reading it live means a newly-configured pad applies on the next request instead of only after every live session has expired.

A reused session keeps its cached captcha type, and a pinned site keeps serving the type it pinned. Making a category's `captchaType` override win over a site-level pin is a larger behaviour change and is left on prosopo/captcha#3463.

Blocking was never affected by any of this: `resolveTrafficFilterCheck` runs at submit time from the site's current settings and a fresh IP lookup, so a blocked category was always rejected regardless of how the challenge was issued.

Tests: the pad is attached on a reused session without evicting it or changing its cached type, and on a site pinned to each of pow / image / puzzle without changing which challenge is sent.
