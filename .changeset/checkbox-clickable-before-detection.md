---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/cypress-shared": patch
---

The checkbox can be clicked as soon as the widget appears, instead of spinning until bot detection has finished.

Detection downloads and runs a detector bundle before the widget knows which challenge to show, which took around three seconds on staging. The checkbox used to sit in its loading state for all of that. Now it is live from the first paint. A click made while detection is still running switches the box to "Checking", is remembered along with where the user clicked, and is replayed on whichever challenge detection picks, so the user never has to click twice.

Nothing about what a token needs has changed: no challenge opens and no token is issued until detection has produced a verdict, so clicking early does not let a bot skip it. Synthetic clicks are still ignored, and a detection failure still falls back the same way it did before.

Tests: the checkbox is live while detection is pending; a click during detection shows the spinner and opens the chosen challenge with the click position once detection lands; a keyboard activation is held the same way; a synthetic click is ignored. `manualStart.test.ts` is renamed `startMode.test.ts`, since it now covers both start modes.

The e2e `clickIAmHuman` helper now waits on `/captcha/image` rather than any `/captcha/*` request. Cypress now clicks the checkbox before `/frictionless` has answered, so the broad pattern was catching that response instead of the image challenge.
