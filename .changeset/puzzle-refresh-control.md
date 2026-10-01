---
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-react": patch
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/locale": minor
---

Add a refresh control to the puzzle captcha.

A user who can't solve the puzzle they were given can now ask for a different one, from a button in the puzzle's header. The replacement comes through a new frictionless session, like a wrong answer already does.

The widget tells the provider which session was refreshed (`refreshOf`). The provider then records `refreshOf`, `refreshCount` and `refreshedAfterMs` on the new session, so refresh behaviour can be scored later. After three refreshes in a row it serves an image challenge instead, with reason `PUZZLE_REFRESH_LIMIT`. It only does this if the site has image enabled. The switch only goes from puzzle to image, so a client that lies about its refreshes can only make its own challenge harder. A client that leaves the field out gets a normal session, the same as reloading the page.

The image widget's reload button now reports itself as a refresh too. That way a user who was moved onto image isn't sent back to the puzzle by their next reload.
