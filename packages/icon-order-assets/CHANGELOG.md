# @prosopo/icon-order-assets

## 0.2.0
### Minor Changes

- e13d7a8: New captcha type: `iconOrder`. The user is shown a frame of icons and a legend, and clicks the legend's icons in the order given.
  
  Icon-order is off by default. Only Prosopo can switch it on for a site, with the `captchaTypeFeatureFlags.iconOrder` feature flag; the site owner cannot. A site without the flag is never served icon-order by any route, and the challenge endpoint refuses it. Once the flag is on, the owner can still keep icon-order out of the frictionless flow with `frictionlessTypes.iconOrder`, the same way as image and puzzle.
  
  The answer never leaves the provider. Icon positions are stored on the challenge record, and the widget receives only the rendered frame and legend. Grading checks order as well as position, and each icon's hit radius scales with its size. Verifying a token is single-use under concurrent requests.
  
  `@prosopo/icon-order-assets` draws the imagery, and `@prosopo/procaptcha-icon-order` is the widget. Its text is translated into every supported language.
  
  Puzzle and icon-order now share their server code: challenge and solution handlers, the verify route, the submit and verify pipeline, and the database record methods. The widget code they have in common moves into `@prosopo/procaptcha-common`: the lazy mount wrapper, manager expiry and dispose, spent-session handling, behavioural data encryption and trusted click coordinates. Puzzle's behaviour is unchanged.
  
  The demo playground has icon-order pages, and there is an end-to-end test for it.

### Patch Changes

- Updated dependencies [e13d7a8]
  - @prosopo/puzzle-assets@0.2.1
