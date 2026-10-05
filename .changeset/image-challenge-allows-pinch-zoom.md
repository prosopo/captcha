---
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-bundle": patch
---

You can now pinch to zoom the image challenge. The panel set `touch-action: pan-y`, which lets a finger scroll it but tells the browser to ignore a pinch, so someone who could not make out a small tile had no way to get a closer look. It is now `pan-y pinch-zoom`, which keeps the scrolling and allows the zoom.

Nothing else blocked zooming — the Protect challenge pages already allow it up to 5x — so this one property was the whole barrier. Confirmed honoured by Chrome on Android 14.
