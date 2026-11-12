---
"@prosopo/procaptcha-common": patch
---

The framed checkbox forwards its mouse, press and touch input to the host page. Input that arrives before the detector is listening, such as a tap the moment the page loads, is kept in the page's early behaviour capture so it is not lost when the frame is redrawn.
