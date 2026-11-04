---
"@prosopo/icon-order-assets": patch
"@prosopo/puzzle-assets": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/provider": patch
---

Icon order challenges can now be redrawn exactly, the way puzzle challenges already can.

- The provider saves what it needs to redraw each icon order challenge on its record: the render seed, the frame geometry and the render settings (`render`).
- `@prosopo/icon-order-assets/browser` is a new entry that rebuilds a challenge from those inputs without `sharp`, so the portal can show the image a visitor was served. It returns the frame and the target strip as SVG plus the grain to lay over the frame. Rasterised the same way, the frame matches the served one byte for byte.
- `@prosopo/puzzle-assets/browser` also exports `hslToRgb` and the `Prng` type, which the new entry uses.

The seed regenerates the answer too, so like the puzzle seeds it is never sent to a client.
