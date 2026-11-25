---
"@prosopo/types": minor
"@prosopo/widget-skeleton": minor
"@prosopo/procaptcha-bundle": minor
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-frictionless": patch
---

Sites can now style the widget with their own colours, square or rounded corners, and their own font. Set `palette`, `shape` and `font` in the render options, or use the `data-palette-*` (for example `data-palette-primary`), `data-shape` and `data-font` attributes. All the other colours the widget needs are worked out from the primary colour. Colours that are not hex and fonts that could break the stylesheet are ignored, and the default look is used instead. The Prosopo logo changes to a shade of purple that is easy to read on the chosen background, or to black or white if no purple is.
