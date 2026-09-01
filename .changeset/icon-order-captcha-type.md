---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-icon-order": minor
"@prosopo/cli": patch
"@prosopo/client-bundle-example": patch
---

New captcha type: `iconOrder`, a frame of procedurally generated icons with a legend naming which of them to click and in what order.

The answer never leaves the provider. Icon positions and the required order are written to the challenge record before the response is sent, and the widget receives only the composited frame and the legend strip — there is no coordinate for a client to echo back. Grading is strict on order, and the hit radius scales with each icon's own size so the renderer's size jitter doesn't make small targets disproportionately hard.

Two new packages carry it: `@prosopo/icon-order-assets` generates the imagery (reusing `puzzle-assets`' PRNG, background generator, encoders and background buffer), and `@prosopo/procaptcha-icon-order` is the widget.

The server-verify pipeline shared by every interactive type — replay and recency checks, client-session correlation, access policies, spam rules, traffic filter, IP validation and the decision machine — moves to a new `InteractiveCaptchaManager` base that both the puzzle and icon-order managers extend. Puzzle's behaviour is unchanged.

Existing sites are unaffected: icon-order ranks above puzzle and below image wherever captcha types are ordered by harshness, and captcha-type coercion only reaches for icon-order when icon-order was asked for, leaving the puzzle and image fallbacks exactly as they were.
