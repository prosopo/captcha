---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
---

Fix the image challenge laying out two columns instead of three on a phone, which pushed the last images below the screen where they could not be reached.

On a Samsung A52s the image grid is 345.578px wide. Each tile asked for `calc(33.333% - 5.33px)` at an 8px gap, so three tiles and the two gaps between them came to 345.584px — **six thousandths of a pixel too wide**. That is enough for the browser to wrap, so the challenge drew two columns and five rows rather than three and three. The panel went from about 370px tall to about 1080px, and three of the nine images ended up below a 718px viewport.

The tile width is now written as `calc((100% - 16px) / 3)`, leaving both the subtraction and the division to the browser. There is nothing left to round, so three tiles and their gaps come to exactly the width of the row at every gap the grid draws.

This arrived with the dialog randomisation, which replaced a fixed `calc(33.333% - 10px)` with a width derived from the randomised gap. The old value subtracted a whole gap per tile where only two thirds was needed, so it happened to leave about 10px of slack and always fitted. Deriving the width exactly removed the slack, and the rounding then tipped it over. Which gaps break depends on the arithmetic — 8, 11 and 14 round down and overflow, the rest do not — so it looked intermittent.

The panel that holds the images is also `touch-action: pan-y` rather than `touch-action: none` now. It is an `overflow-y: auto` box, so on a phone it is the thing a finger has to drag when the images do not fit, and `none` told the browser not to pan it at all — which is what turned "some images are off-screen" into "some images cannot be reached". Stopping the page behind from scrolling is `overscroll-behavior`'s job and it still does it. That one is older than the randomisation; it came in with the React to vanilla rewrite, and the React component before it had the same thing.

Covered by a test that works out where three tiles and two gaps land for every gap the challenge draws, against a set of panel widths including the A52s' 345.578px. It fails on the old expression with exactly the numbers measured on the device.
