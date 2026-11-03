---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Decision machines checking a puzzle solve now receive the puzzle's start point (`puzzleOrigin`), target (`puzzleTarget`) and tolerance (`puzzleTolerance`), alongside the drag events they already get. Before, a rule could see the drag but not where it was meant to go.
