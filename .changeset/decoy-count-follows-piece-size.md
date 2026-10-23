---
"@prosopo/provider": patch
---

Stop the puzzle burying the background under decoys, especially on phones.

The difficulty ladder draws `decoyCount` and `pieceScale` from a band independently — one in `samplePuzzleDifficulty`, the other in the renderer's own piece-size draw — so nothing tied how many decoys there were to how big they were. Ten decoys against a 126px piece is a different puzzle from ten against a 42px one, and a level was not monotonic in what the user actually saw: at the current bands a level-0 render could be crowded roughly seven times harder than a level-3 one.

Touch was worse rather than better. `easePieceScaleForTouch` raises the piece-scale floor so a finger cannot hide the piece, but it left the decoy count alone — bigger decoys in the same number is strictly more crowding. At level 4 the *minimum* coverage on a touch device was 1.56x the background area, so every render was a pile of overlapping pieces no one could read.

The decoy count is now trimmed against the piece size actually drawn, so the decoys cannot cover more of the background than a ceiling allows. Touch takes a lower ceiling than desktop, which is what makes easing for touch help instead of hurt. The cap only ever reduces the count, so no render becomes harder than the ladder intended, and a count already inside the ceiling is untouched — a render drawn near the middle of any level is unaffected and only the crowded corner is trimmed.

The trimmed count is what gets rendered *and* what is written to `render.settings.decoyCount` on the challenge record, so a replay reproduces the puzzle the user saw. The browser renderer takes the count as an input rather than deriving it, so the node and JS paths stay in step without a change to `@prosopo/puzzle-assets`.
