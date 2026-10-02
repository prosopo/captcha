---
"@prosopo/puzzle-assets": patch
---

Make the puzzle piece look like a puzzle piece, sit apart from the background, and survive colour-blind vision.

Three complaints from the Twickets call, all about how the challenge looks.

**The silhouette is now always a jigsaw piece.** The generator had five unrelated shape families — jigsaw, circle, rounded rectangle, regular polygon, flower — so four pieces in five were not jigsaw-shaped at all, and a first-time user was as likely to be handed a heptagon as anything recognisable. There is now one grammar: a rounded body where each of the four edges independently gets a tab, a blank or nothing, with the knob's position along its edge, its radius and the corner rounding all varying.

Silhouette variety is deliberate anti-automation and it has not been given up — it has moved inside the grammar. 3^4 edge combinations before any of the continuous parameters, against five families with a handful of parameters each, so the space did not shrink; what changed is that every sample in it reads as a piece of a jigsaw. A sweep over 400 seeds finds more than 320 distinct coarse signatures, so there is nothing like a template to match against.

The piece is also scaled to fit its bounding box now, measured from the knobs actually drawn, rather than the body being inset by the worst case the parameters could produce. Insetting for the worst case shrinks every piece to make room for the largest tab that was never drawn. A tab reaching the border used to come out clipped flat, which looks like a manufacturing defect rather than a jigsaw tab.

**The piece is separated by a luminance step, not by hue.** It is cut from the same mesh the background is drawn from, so on an unlucky palette it was the same colour as whatever it was resting on and the only thing dividing them was a CSS drop-shadow. It now carries an outline whose brightness steps away from its own, in the direction chosen from the piece's own mean luminance — a dark piece gets a light rim, a light piece a dark one. A fixed direction vanishes at one end of the range, which is how a cue that is present in the code ends up absent on screen.

The size of the step is solved for per piece to reach a target contrast ratio, not set as a fixed byte offset: 40 units out of 255 is obvious on a mid grey and nearly invisible near white. Being a brightness step rather than a hue, it survives greyscale, a monochrome display, every dichromacy and a phone screen in sunlight — which the tests assert by measuring luminance only, and again after flattening the piece to grey.

**Palette generation now has a measured contrast floor.** The six palettes are analogous-hue families, which is what makes a mesh gradient look deliberate and is also the worst case for colour-blind vision: a band of neighbouring hues at one lightness is exactly what a dichromat collapses to a single colour. Nothing checked for that, so a palette could lose all its structure for 1 in 12 men and no test would notice.

A new `contrast` module does WCAG relative luminance on linearised sRGB and Viénot–Brettel–Mollon simulation of protanopia, deuteranopia and tritanopia. `drawPalette` now redraws while its widest pair falls below the floor under *any* of the four vision types, widening the lightness band on each retry rather than giving up after N tries — a floor that can be returned past is not a floor. The first attempts are unstretched, so an ordinary draw is exactly what it was before and only a failing palette gets touched.

The floor is on the palette's *range*, not on every pair: a gradient needs near-neighbours, and demanding contrast between them would produce stripes. What it rules out is a field that is uniformly one brightness.

**Tests sweep seeds rather than checking an example.** 45 tests, including 400-seed sweeps of the palette floor, the presence of tabs, silhouette variety, the bounding box, and the area covered; and 120-seed sweeps of the rim's luminance step, its direction, its survival in greyscale, and its survival under each dichromacy. A palette or parameter that is fine on the one seed somebody happened to look at and unreadable on a tenth of the rest is the failure that shipped, and a single-seed test cannot see it.

One thing the tests could not see, found by rendering the output and looking at it: a fixed 4px rim is a tidy outline on a large piece and most of the surface area of a 44px one — the default — so the whole piece read as a pale blob rather than as a piece with a lit edge. No measurement of rim-versus-core contrast catches that, because by that measure a piece which is entirely rim scores perfectly. The rim is now proportional to the piece size, and the tests read the band geometry from the renderer so the measurement cannot drift away from what was drawn.
