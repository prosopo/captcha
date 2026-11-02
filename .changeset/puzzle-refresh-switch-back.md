---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/api": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
"@prosopo/locale": patch
---

Finish the puzzle refresh and switch-to-image work.

- A user who switched their puzzle to an image now keeps the image when they refresh it. Before, a plain refresh handed the puzzle straight back.
- That image now has a puzzle-piece button to go back to the puzzle. It is only offered on an image the user chose themselves, and only while going back would not run into the three-refresh limit. Going back only drops the user's choice: if routing would serve an image anyway, they still get the image.
- A refresh only extends a chain started by the same user, IP and site, so nobody can borrow someone else's refresh count or switch.
- Sites pinned to puzzle now record refreshes too. The three-refresh switch to image applies to them only when the superadmin puzzle-to-image switch is on, since they chose puzzle on purpose.
- Routing machines now receive `input.refresh` (`count` and `afterMs`) on a refresh, so rules can act on how often and how fast a user refreshes.
- New widget string `WIDGET.SWITCH_TO_PUZZLE`, translated into every locale. The puzzle's switch button is now a shared `mountChallengeSwitchButton` with an image or puzzle icon.
