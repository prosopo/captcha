---
"@prosopo/puzzle-assets": minor
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
---

Store everything needed to redraw a puzzle, so the portal can show the exact challenge a user was served.

Until now a puzzle record kept the target, the origin and the accuracy required (`tolerance`), and
nothing else. The things that decide what the puzzle actually looked like — how many decoy shapes were
scattered on it, how dark they were, how big the piece was, and which background was used — were
picked per challenge and then thrown away. So you could see that someone failed by 11px and had no way
to know whether they had been handed an easy puzzle or a nasty one.

Puzzle records now carry a `render` object with all of it: the difficulty ladder level, the piece size,
the frame geometry, the five render settings, and the two 128-bit seeds that regenerate the imagery.
Given those, the portal reproduces the background and the piece byte for byte.

To make that possible the renderer had to become reproducible. `renderPuzzle` and `createBackground`
now take an optional seed and report the one they used, instead of generating one internally and
discarding it; the background pool hands out each image together with its seed. Default behaviour is
unchanged — omit the seed and you still get a fresh random one.

The ladder level is new on the session too (`puzzleLevel`), because it was computed when the puzzle
was escalated and never written down anywhere. It is absent when the ladder did not choose the
puzzle — a site-configured puzzle or a traffic-filter override has no level.

The record is patched after the imagery is produced rather than written with the rest of the record,
because the piece size and the seeds only exist once the render has run, and the target has to be
durable before it is expressed in pixels. If that patch fails it is logged and ignored: losing a
diagnostic must not cost the user their solve. Records written before this change, and any challenge
whose render threw, simply have no `render`.

**The seeds are secret.** `puzzle-assets/src/prng.ts` explains why: they regenerate the clean
background, and a clean background can be diffed against the composite to read the target position
straight off. They were previously barred from leaving the provider entirely. They may now sit on the
captcha record, and nowhere else — not in a response, not in a log, not on the session. Anything that
exposes a puzzle record to a caller has to drop `render.backgroundSeed` and `render.renderSeed`, and
must not serve them at all while the challenge is still live. The comment in `prng.ts` now says so.

Test coverage. Three guards, each confirmed to fail when the thing it protects is broken:
`renderReplay.unit.test.ts` re-renders from the stored fields and asserts the bytes match, with one
case per field asserting that changing *only* that field changes the output — so a record missing a
field cannot pass; `puzzleRenderer.unit.test.ts` replays through the same entry points the portal would
use, which catches a background paired with the wrong seed; and `schemas.test.ts` asserts every
sub-field survives a strict-mode mongoose write, since a field absent from the schema is dropped
silently and would store nothing at all.
