---
"@prosopo/procaptcha-icon-order": patch
---

Fix icon-order being unsolvable on touch devices.

The frame listened for `click` and `touchend`. On a phone a tap fires
`touchend` and then the compatibility `click` the browser synthesises at the
same coordinates, so every tap was recorded twice: three correct taps arrived
at the provider as six clicks, `gradeClicks` rejected them on
`clicks.length !== targets.length` before it ever compared a position, and the
user got `CAPTCHA.INVALID_SOLUTION` for an answer that was right. Staging
records bear this out — six clicks against three targets, in near-identical
pairs, each pair well inside its target's hit radius.

`touch-action: none` was already set on the frame and does not help; it
suppresses double-tap zoom, not the synthesised click. The fix is to listen to
one event family: `pointerup`/`pointermove` cover mouse, touch and pen and
fire once per interaction.
