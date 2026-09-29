---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha": patch
---

The image captcha widget now tells the provider whether each tile, and the checkbox, was picked with a mouse or finger or with the keyboard. Keyboard presses have no screen position, so they all arrive as (0, 0). The provider used to see those repeats as a script clicking the same pixel and reject people who solve with the keyboard. It now looks for repeated positions among pointer selections only. It rejects a keyboard selection that claims a position. Requests from older widgets, which send no input method, are checked as strictly as before. The input method is stored on the commitment next to the coordinates.
