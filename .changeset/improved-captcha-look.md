---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
"@prosopo/widget-skeleton": patch
---

Refresh the captcha widget appearance with a Material 3 theme across the widget-skeleton, procaptcha-common, procaptcha-react and procaptcha-puzzle packages.

- Split the single tinted surface into M3 surface roles: the widget now sits on a white `surface` (surfaceContainerLowest) and the challenge dialog on `surfaceContainerHigh`.
- Removed all drop shadows. Separation comes from surface roles and outlines; hover and drag feedback use M3 state layers and outline rings instead.
- Added shared `typography` (label large / title medium / body medium) and `stateLayer` (8%/10%/10%) tokens, and aligned the shape scale to M3 steps.
- Buttons: M3 label-large type, 40dp height, spec padding, state-layer hover in place of a brightness filter, and no resting elevation on the filled variant.
- Added the missing focus indicators (3dp outline, 2dp offset, keyboard-only) to the checkbox, buttons and reload control.
- Secondary dialog text now uses the `onSurfaceVariant` role rather than reduced opacity.
