---
"@prosopo/provider": patch
---

fix(provider): evict dedup session in `/frictionless` when the configured routing machine wants a different captchaType than the cached session. Previously the dedup short-circuit only checked the access policy, so a freshly-published routing machine was invisible to any user with an active dedup pointer — the initial frictionless call returned the stale baseline, the post-PoW router then minted an escalation session the widget couldn't follow, and the next `/captcha/{type}` call surfaced `API.INCORRECT_CAPTCHA_TYPE` with no path forward. Adds `FrictionlessManager.applyRoutingMachine(baseline, ctx)` as the public wrapper used by the handler.
