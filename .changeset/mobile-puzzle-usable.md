---
"@prosopo/procaptcha-puzzle": patch
"@prosopo/client-bundle-example": patch
---

Make the puzzle CAPTCHA usable on mobile.

- `procaptcha-puzzle`: add `touch-action: none` to the puzzle piece. Without
  it, on a zoomed-in mobile viewport the browser claims the touch as a pan
  gesture before the `touchmove` handler runs, so the page scrolls instead
  of the piece moving.
- `client-bundle-example`: inject a viewport meta tag on every demo page and
  fix the collapsible page-picker nav on ≤480px screens (a media-query max
  height was clamping the bar even when expanded).
