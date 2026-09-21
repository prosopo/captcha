---
"@prosopo/procaptcha-common": patch
---

Make the checkbox's label part of the target, so pressing the words activates it.

Only the 28px box itself responded to a press. The 15px of space around it is margin, which belongs to no element, and the "I am human" text beside it was a plain `<label>` with nothing tying it to the control — so a press that landed anywhere but the box was silently dropped. On a phone that is most presses, and it reads as the widget ignoring the first tap and working on the second.

The label now names the input, which is what makes the words activate it. The association is refreshed whenever the input's id is regenerated.
