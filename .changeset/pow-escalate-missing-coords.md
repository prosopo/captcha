---
"@prosopo/provider": patch
"@prosopo/types": patch
---

feat(provider): escalate verified PoW solves with missing coordinates to an image captcha. Every current widget embeds the checkbox click position in the solution salt, so a verified solve that arrives without coordinates didn't come through the official widget path. Such session-linked solves are now escalated to an image captcha via the existing post-PoW routing/escalation mechanism instead of being approved outright. Adds the `MISSING_COORDINATES` FrictionlessReason.
