# @prosopo/procaptcha-icon-order

## 0.2.1
### Patch Changes

- Updated dependencies [4570692]
  - @prosopo/procaptcha-common@2.21.0
  - @prosopo/api@4.6.0
  - @prosopo/types@5.15.0
  - @prosopo/locale@3.9.0
  - @prosopo/common@3.1.64

## 0.2.0
### Minor Changes

- b299a91: An audio challenge, offered only as an accessibility alternative, like reCAPTCHA's audio option. The user hears a short sequence of spoken digits and types them in.
  
  It is off by default and needs two switches. Prosopo has to turn on the `captchaTypeFeatureFlags.audio` feature flag for the site, which the site owner cannot do, and the site owner has to set `audioAccessibilityEnabled`. When both are on, image, puzzle and icon-order challenges show a "Use audio instead" button. Pressing it swaps the visual challenge for the audio one. After a wrong answer the user stays on audio and gets a fresh clip.
  
  Audio is never a captcha type that can be selected or routed to. A site's `captchaType`, traffic-filter categories, Restrict rules and the site-key CLI all reject it, and routing, PoW escalation and the severity tiers leave it out. The provider only serves audio against the visual session the user was already given, and only on a site with both switches on; any other audio request is refused before the session is used up, and a request without a session is always refused.
  
  The spoken digits are synthesised by `@prosopo/audio-assets`, so there is no recorded set of clips to collect. The answer never leaves the provider, and a challenge can be submitted and verified only once, even under concurrent requests. `@prosopo/procaptcha-audio` is the widget. It and the "Use audio instead" button are built on the shared widget code in `@prosopo/procaptcha-common`, and the provider side is built on the shared interactive-captcha code that puzzle and icon-order use.
  
  The demo playground has audio pages, and there is an end-to-end test for it.
- e13d7a8: New captcha type: `iconOrder`. The user is shown a frame of icons and a legend, and clicks the legend's icons in the order given.
  
  Icon-order is off by default. Only Prosopo can switch it on for a site, with the `captchaTypeFeatureFlags.iconOrder` feature flag; the site owner cannot. A site without the flag is never served icon-order by any route, and the challenge endpoint refuses it. Once the flag is on, the owner can still keep icon-order out of the frictionless flow with `frictionlessTypes.iconOrder`, the same way as image and puzzle.
  
  The answer never leaves the provider. Icon positions are stored on the challenge record, and the widget receives only the rendered frame and legend. Grading checks order as well as position, and each icon's hit radius scales with its size. Verifying a token is single-use under concurrent requests.
  
  `@prosopo/icon-order-assets` draws the imagery, and `@prosopo/procaptcha-icon-order` is the widget. Its text is translated into every supported language.
  
  Puzzle and icon-order now share their server code: challenge and solution handlers, the verify route, the submit and verify pipeline, and the database record methods. The widget code they have in common moves into `@prosopo/procaptcha-common`: the lazy mount wrapper, manager expiry and dispose, spent-session handling, behavioural data encryption and trusted click coordinates. Puzzle's behaviour is unchanged.
  
  The demo playground has icon-order pages, and there is an end-to-end test for it.

### Patch Changes

- Updated dependencies [b299a91]
- Updated dependencies [e13d7a8]
- Updated dependencies [270395d]
  - @prosopo/types@5.14.0
  - @prosopo/api@4.5.0
  - @prosopo/procaptcha-common@2.20.0
  - @prosopo/locale@3.8.0
  - @prosopo/common@3.1.63
