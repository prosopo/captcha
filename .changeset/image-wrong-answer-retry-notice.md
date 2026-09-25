---
"@prosopo/types": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
---

A wrong image answer no longer just closes the popup. The widget now says "Not quite — try again" beside the checkbox (the same translated line the puzzle uses), and the checkbox stays clickable so the user can have another go. This happens even when the site supplies its own failed callback, and it survives the frictionless widget restarting itself after the failure. The notice clears as soon as the user starts again.
