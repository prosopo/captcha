---
"@prosopo/types": patch
"@prosopo/widget-skeleton": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-audio": patch
---

The widget now works on sites whose Content Security Policy only allows stylesheets carrying a nonce. Pass the nonce as `nonce` in the render options or as `data-nonce` on the widget element; if neither is set, the widget uses the nonce from a script on the page. Before, such a policy blocked the widget's styles and it rendered unstyled.
