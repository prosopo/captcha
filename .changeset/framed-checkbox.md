---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-react": patch
---

Optionally draw the widget checkbox in a frame served beside the bundle (build flag PROSOPO_FRAMED_CHECKBOX).

A challenge opened by a click on the framed checkbox focuses its panel rather than its first control. The page never sees that click, so the browser would otherwise draw a keyboard focus ring on the first image.
