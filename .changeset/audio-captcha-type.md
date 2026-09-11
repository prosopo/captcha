---
"@prosopo/audio-assets": minor
"@prosopo/procaptcha-audio": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/database": minor
"@prosopo/cli": minor
"@prosopo/captcha-severity": minor
"@prosopo/locale": minor
"@prosopo/keyring": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-react": minor
---

Add an audio captcha: the challenge speaks five digits and the user types them.

It is a captcha type in its own right, selectable and routable like image, pow
and puzzle, with its own provider routes, widget and database record. It is also
the accessibility path: a per-site `audioAccessibilityEnabled` flag adds a "use
audio instead" control to the image and puzzle widgets, leaving the primary
challenge unchanged.

The speech is synthesised rather than recorded. `@prosopo/audio-assets` is a
formant synthesiser, so there is no fixed set of clips to collect.

The answer is never sent to the browser, each challenge can only be answered
once, and grading is exact-match after non-digits are stripped, so "1 2 3 4 5"
and "12345" both pass.

The render defaults are tuned so real users can hear the digits rather than for
difficulty, and the surrounding signals do the gatekeeping.

Covered by unit tests for the synthesiser, the widget, the provider tasks and
the grading path, and by a cypress spec that drives a live provider end to end.
