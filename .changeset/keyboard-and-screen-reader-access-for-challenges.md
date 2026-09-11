---
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-react": minor
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/locale": patch
---

Make the challenges usable with a keyboard and a screen reader.

The puzzle could only be solved by dragging with a mouse or a finger. The piece
was a plain `div`, so it could not be tabbed to, had no name or role, and a
screen reader announced nothing at all — a user on assistive tech could tick "I
am human", get a silent overlay, and have no way forward. The image captcha had
the same problem in its tiles.

What changed:

- The puzzle piece can now be focused and moved with the arrow keys (hold shift
  for smaller steps, Home to start over, Enter or Space to submit). It has a
  name, a role, and a visible focus ring.
- The puzzle announces its state as you go: where the piece is, as a percentage
  across and down the board; that an answer is being checked; and that a failed
  go has been replaced by a fresh puzzle.
- The image captcha tiles are now buttons rather than clickable `div`s, so they
  can be tabbed to and activated with Enter or Space, and they report whether
  they are selected instead of only looking selected.
- Both challenges now open as a proper dialog: it takes focus when it opens,
  keeps Tab inside itself, and gives focus back to the checkbox on close.
- The spinner that replaces the checkbox while a check runs used to drop focus
  to the top of the page without saying why. It now takes focus in the
  checkbox's place, names itself, and hands focus back when the check finishes.
  This affects the pow, image and puzzle flows.
- The puzzle's on-screen text was hardcoded English. It now goes through the
  locale package, and the new strings are translated into all 32 locales.

A visual puzzle still cannot be solved by someone who cannot see it — the widget
is never told where the target is, so there is nothing it could describe. Sites
that need a challenge a blind user can complete should use the pow captcha type,
which needs no interaction beyond the checkbox.
