---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
---

Stop the widget taking focus off the form the user is filling in.

While the widget checks a user, its checkbox is replaced by a spinner, and the
box takes focus back when the check finishes so a keyboard user is not left
stranded at the top of the page. It did that unconditionally, so if the user
spent the wait typing into the page's own form, the box grabbed focus off
whatever field they were in — and the keystroke that arrived with it went
nowhere. It now only claims focus back when nothing else holds it, which is
where removing the spinner leaves it.

This is what made the `puzzle` cypress spec flaky: it fills the signup form as
soon as the puzzle is solved, and lost the race with the widget often enough to
fail CI.

Covered by a new unit test in `procaptcha-react` that focuses an element outside
the widget mid-check and asserts focus is still there afterwards.
