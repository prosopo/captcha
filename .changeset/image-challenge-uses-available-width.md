---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-bundle": patch
---

The image challenge now grows to fit the screen it is on. Before, the popup sat at a fixed 322px whatever the device, because the box holding it shrank to wrap its contents and the panel inside could only reach the grid's 300px minimum. That left every image tile at 94.7px — on a phone with 344px of room going spare, and on a 1280px desktop where the panel is allowed to be 500px wide.

Tiles now scale with the viewport: 102px on a Galaxy S22, 119px on an S22 Ultra, 107px on an iPhone SE, 154px on desktop. A screen narrower than the 300px minimum (a folding phone's cover display, say) still scrolls sideways exactly as before, and the floating placement is untouched.

Measured in Chromium at each device's viewport and pixel ratio; the 3x3 grid still lays out as three rows on all of them.
