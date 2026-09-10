---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
---

Stop the image captcha losing its instruction line and top row of images on mobile.

On iOS the challenge panel was being shifted up by 100% of its own height, so
anything taller than half the screen ran off the top with no way to scroll back
to it. Users saw nine images and a Next button but no "Select all containing
..." prompt, which made the challenge unsolvable.

The lift was compensating for the layer underneath it being sized with
`100vh` — on iOS Safari that is the height the page would have if the browser
toolbars retracted, so the centring box was taller than the visible area and
pushed the panel down under the bottom bar. Sizing that box with `100dvh`
instead centres correctly on its own, so the lift is gone. The panel is now
centred as a flex item and capped at the viewport height, scrolling when it
does not fit rather than overflowing off both edges.
