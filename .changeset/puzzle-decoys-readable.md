---
"@prosopo/puzzle-assets": patch
"@prosopo/captcha-severity": patch
"@prosopo/provider": patch
"@prosopo/types": patch
---

Make the puzzle easier for people to read at the normal difficulty levels.

Every decoy hole has the same outline as the real one, so the real hole has to stand out by being the darkest. Decoys now keep clear of the real hole and of each other, so overlapping decoys no longer form a dark patch that looks deeper than the real hole. The default puzzle and difficulty levels 0 and 1 now use fewer, lighter decoys with softer edges. Levels 2 and above are unchanged apart from a lower minimum decoy count at level 2.

The decoy cap no longer raises a small decoy count up to its minimum; it only ever lowers it.
