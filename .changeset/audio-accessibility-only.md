---
"@prosopo/types": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-icon-order": minor
"@prosopo/procaptcha-audio": minor
"@prosopo/types-database": patch
"@prosopo/user-access-policy": patch
"@prosopo/captcha-severity": patch
"@prosopo/cli": patch
"@prosopo/keyring": patch
"@prosopo/client-bundle-example": patch
---

Audio is now an accessibility alternative only, the way reCAPTCHA's audio option is.

A user reaches the audio challenge by pressing "Use audio instead" on a visual challenge, and that control is only shown when the site has `audioAccessibilityEnabled` turned on, which is off by default. Audio is no longer a type anything can select: a site's `captchaType`, a traffic-filter category, a Restrict access rule and the site-key CLI all reject `audio`, and routing machines, PoW escalation and the severity tiers no longer include it.

Because nothing mints an audio session, the provider now serves an audio challenge against the visual (image, puzzle or icon-order) session the user was given, and only when the site has the alternative on. A sessionless audio request is refused. This also fixes the alternative end to end: pressing the control previously re-ran /frictionless, got a visual session back, and had the audio challenge request rejected as the wrong captcha type.

The control is now offered on the icon-order challenge as well as image and puzzle. After a wrong audio answer the widget stays on audio instead of dropping the user back onto the visual challenge they asked to avoid.

The dev `audio` site key is seeded as an image site with the alternative on, and the audio demo pages and Cypress spec drive the control rather than a site configured as audio.
