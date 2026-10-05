---
"@prosopo/procaptcha-react": patch
---

Put the image challenge back in the middle of the screen. The change that let
it use the full width of a phone screen made the box it sits in fill the page,
and the challenge was left sitting against the left edge instead of centred.
It now centres itself in whatever width that box gives it, on every screen
size.
