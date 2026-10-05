---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/audio-assets": minor
"@prosopo/procaptcha-audio": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-react": minor
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-icon-order": minor
"@prosopo/locale": minor
"@prosopo/captcha-severity": patch
"@prosopo/user-access-policy": patch
"@prosopo/keyring": patch
"@prosopo/cli": patch
"@prosopo/scripts": patch
"@prosopo/client-bundle-example": patch
"@prosopo/client-example-server": patch
"@prosopo/cypress-shared": patch
---

An audio challenge, offered only as an accessibility alternative, like reCAPTCHA's audio option. The user hears a short sequence of spoken digits and types them in.

It is off by default and needs two switches. Prosopo has to turn on the `captchaTypeFeatureFlags.audio` feature flag for the site, which the site owner cannot do, and the site owner has to set `audioAccessibilityEnabled`. When both are on, image, puzzle and icon-order challenges show a "Use audio instead" button. Pressing it swaps the visual challenge for the audio one. After a wrong answer the user stays on audio and gets a fresh clip.

Audio is never a captcha type that can be selected or routed to. A site's `captchaType`, traffic-filter categories, Restrict rules and the site-key CLI all reject it, and routing, PoW escalation and the severity tiers leave it out. The provider only serves audio against the visual session the user was already given, and only on a site with both switches on; any other audio request is refused before the session is used up, and a request without a session is always refused.

The spoken digits are synthesised by `@prosopo/audio-assets`, so there is no recorded set of clips to collect. The answer never leaves the provider, and a challenge can be submitted and verified only once, even under concurrent requests. `@prosopo/procaptcha-audio` is the widget. It and the "Use audio instead" button are built on the shared widget code in `@prosopo/procaptcha-common`, and the provider side is built on the shared interactive-captcha code that puzzle and icon-order use.

The demo playground has audio pages, and there is an end-to-end test for it.
