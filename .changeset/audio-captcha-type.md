---
"@prosopo/audio-assets": minor
"@prosopo/procaptcha-audio": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/database": minor
"@prosopo/cli": patch
"@prosopo/captcha-severity": minor
"@prosopo/locale": minor
"@prosopo/keyring": patch
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-react": minor
"@prosopo/scripts": patch
"@prosopo/client-bundle-example": patch
---

Add an audio challenge as an accessibility alternative: the challenge speaks five digits and the user types them.

A site turns it on with `audioAccessibilityEnabled`, which is off by default. Its image, puzzle and icon-order challenges then offer a "use audio instead" control, and a user who presses it is served the audio challenge in place of the visual one. Audio is not a captcha type a site selects or a rule routes to; see the accessibility-only changeset for how that is enforced. It has its own provider routes, widget and database record.

The speech is synthesised rather than recorded. `@prosopo/audio-assets` is a
formant synthesiser, so there is no fixed set of clips to collect.

The answer is never sent to the browser, each challenge can only be answered
once, and grading is exact-match after non-digits are stripped, so "1 2 3 4 5"
and "12345" both pass.

The render defaults are tuned so real users can hear the digits rather than for
difficulty, and the surrounding signals do the gatekeeping.

Covered by unit tests for the synthesiser, the widget, the provider tasks and
the grading path, and by a cypress spec that drives a live provider end to end.
