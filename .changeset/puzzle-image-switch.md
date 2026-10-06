---
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-common": minor
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/locale": minor
"@prosopo/cypress-shared": patch
---

Let a user swap the puzzle captcha for an image challenge, on sites where Prosopo has switched it on.

Sites get a new staff-only setting, `widgetFeatureFlags.puzzleImageSwitch`. It is off by default and has no stored default. When it is on and the site allows image challenges, the puzzle response says `imageSwitchAvailable: true`. The puzzle then shows a small grid icon next to its title, with a "Switch to an image challenge" tooltip on hover or keyboard focus. After two wrong answers or refreshes in a row, the icon fills with the primary colour and its tooltip shows without a hover, because a touch screen has no hover. The tooltip goes away once the user starts moving the piece.

Pressing it re-mints the session the same way refresh does, with `switchToImage: true`. The provider only honours that when the request is a refresh of a puzzle session on the same site and the switch is on. The new session is then an image challenge with reason `PUZZLE_USER_SWITCH`. Like the refresh limit, it only ever moves from puzzle to image, so a client that fakes the request can only make its own challenge harder.
