---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-bundle": patch
---

If a challenge is left open until its time limit runs out, the widget used to close the challenge and untick itself without saying why. It now shows a "captcha solution has expired" message under the widget, in the widget's language, the same way a failed challenge does. The message is removed when the next challenge is solved. Sites that pass a `chalexpired-callback` are unaffected.
