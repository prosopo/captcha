---
"@prosopo/captcha-severity": minor
"@prosopo/provider": minor
---

Cap automatic puzzle escalation one rung lower on touch devices than on pointer devices.

The puzzle's `tolerance` is an absolute CSS-pixel target and the widget renders into a fixed 300x200 container on every device, so a difficulty level asks the same placement accuracy of a fingertip as it does of a mouse.

`MAX_AUTO_ESCALATION_LEVEL_TOUCH` and `resolveMaxEscalationLevel(siteMaxLevel, isTouch)` are new in `@prosopo/captcha-severity`. The resolver takes the stricter of the site's own `puzzleMaxDifficulty` and the device ceiling, so a site set to 3 or 4 cannot out-vote the touch ceiling and a site pinned to 0 is not raised by it.

The provider now calls it from both places a puzzle difficulty is chosen: `sendCaptcha`, which reads `routingContext.platform.isMobile`, and the post-PoW escalation in `submitPoWCaptchaSolution`, which derives the platform from the originating session. That second path previously ignored the site's `puzzleMaxDifficulty` entirely and always clamped to the global ceiling; it now respects both caps.

Desktop behaviour is unchanged, and L4 stays unreachable by automatic escalation on either device.
