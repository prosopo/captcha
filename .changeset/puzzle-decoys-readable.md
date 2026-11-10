---
"@prosopo/puzzle-assets": patch
"@prosopo/captcha-severity": patch
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Make the puzzle easier for people to read, and make how many decoys copy the real hole's outline depend on the difficulty level.

A new puzzle setting, `lookalikeDecoys`, sets how many decoys copy the real hole's outline; the rest each have their own shape. At the default and at levels 0 and 1 there are none, so the piece fits only the real hole. From level 2 a few decoys copy it (1-2 at level 2, 2-3 at level 3, 3-5 at level 4), and among those the real hole is the darkest. The value is stored with each puzzle so it replays as it was shown.

Look-alike decoys keep clear of the real hole and of each other, so they no longer pile into a dark patch that looks deeper than the real hole, and no decoy covers the real hole. The default puzzle and levels 0 and 1 use fewer, lighter decoys with softer edges, and decoys at levels 2 and 3 are a little lighter than before.

The decoy cap no longer raises a small decoy count up to its minimum; it only ever lowers it.

Boards vary much more. Six new patterns join the existing ones: wavy stripes, sawtooth stripes, tangent stripes, stripes shaped by a random polynomial drawn for each puzzle, a mosaic of tinted cells, and marble veining. Each board now gets one to three patterns, never two of the same family, and the stripe styles together are picked no more often than any other family, so boards no longer come out mostly ruled. The stripe and dot patterns can be bolder than before.
