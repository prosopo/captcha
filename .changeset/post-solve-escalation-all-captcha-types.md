---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-bundle": patch
---

A correct image, puzzle or audio solve can now be escalated to another captcha type by the routing machine, as PoW and icon order solves already could. The provider runs a second routing pass on the new `postImage`, `postPuzzle` and `postAudio` phases, and the widget hands the user on to the follow-up challenge instead of issuing a token. Audio is judged against the visual type of the session it was served on.

Escalations are capped at two in a row per visit (`escalationDepth` on the session), so a machine cannot bounce a user between two types for as long as they keep solving.
