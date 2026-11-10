---
"@prosopo/puzzle-assets": patch
"@prosopo/captcha-severity": patch
"@prosopo/provider": patch
"@prosopo/types": patch
---

Make the puzzle easier for people to read at the normal difficulty levels.

Three decoys copy the real hole's outline and the rest have their own shapes, so people can rule out the odd shapes at a glance and pick the darkest of the look-alikes. Look-alikes keep clear of the real hole and of each other, so they no longer pile into a dark patch that looks deeper than the real hole, and no decoy covers the real hole. The default puzzle and difficulty levels 0 and 1 now use fewer, lighter decoys with softer edges. Levels 2 and above are unchanged apart from a lower minimum decoy count at level 2.

The decoy cap no longer raises a small decoy count up to its minimum; it only ever lowers it.
