---
"@prosopo/procaptcha-puzzle": patch
---

Stop a tap on the puzzle piece from spending the challenge.

Pressing the piece and letting go without moving it submitted an answer: the piece's own starting position. That position is never the right one, so the solution failed, the widget fetched a replacement — which the provider rejected, because the challenge had already been spent — and the user was dropped back to an unticked checkbox with "challenge failed".

On a mouse this was hard to do by accident. On a phone it is the normal thing to do: the panel opens centred, under the finger that just pressed the checkbox, so a tap lands on the piece far more often than a drag does. The visible symptom is that the first press appears to do nothing and the challenge only works on the second try.

A press and release with no movement now reports nothing and leaves the piece where it was, so the challenge stays open and can still be solved. A real drag is unaffected, including one that returns the piece to where it started — that still carries a movement trail, and is still submitted.
