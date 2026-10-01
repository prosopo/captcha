---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/captcha-severity": minor
"@prosopo/icon-order-assets": minor
"@prosopo/procaptcha-icon-order": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-puzzle": patch
"@prosopo/puzzle-assets": patch
"@prosopo/locale": patch
"@prosopo/keyring": patch
"@prosopo/cli": patch
"@prosopo/scripts": patch
"@prosopo/client-bundle-example": patch
"@prosopo/cypress-shared": patch
---

New captcha type: `iconOrder`. The user is shown a frame of icons and a legend, and clicks the legend's icons in the order given.

It is off unless a site turns it on with `frictionlessTypes.iconOrder`. A site that has not opted in is never served icon-order by any route, and the challenge endpoint refuses it.

The answer never leaves the provider. Icon positions are stored on the challenge record, and the widget receives only the rendered frame and legend. Grading checks order as well as position, and each icon's hit radius scales with its size. Verifying a token is single-use under concurrent requests.

`@prosopo/icon-order-assets` draws the imagery, and `@prosopo/procaptcha-icon-order` is the widget. Its text is translated into every supported language.

Puzzle and icon-order now share their server code: challenge and solution handlers, the verify route, the submit and verify pipeline, and the database record methods. The widget code they have in common moves into `@prosopo/procaptcha-common`: the lazy mount wrapper, manager expiry and dispose, spent-session handling, behavioural data encryption and trusted click coordinates. Puzzle's behaviour is unchanged.

The demo playground has icon-order pages, and there is an end-to-end test for it.
