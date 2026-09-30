---
"@prosopo/captcha-severity": minor
"@prosopo/provider": minor
---

Cap automatic puzzle escalation one rung lower on touch devices than on pointer devices.

The puzzle's `tolerance` is an absolute CSS-pixel target and the widget renders into a fixed 300x200 container on every device, so a difficulty level asks the same placement accuracy of a fingertip as it does of a mouse. A mouse resolves 1-2px; a finger does not.

Measured over 7 days of production puzzles, restricted to residential IPs with no VPN, proxy, Tor, datacenter, crawler or abuser flag so the population is as close to real humans as the data allows, first-attempt pass rate by the tolerance actually served:

| tolerance | 15 | 14 | 13 | 12 | 11 | 10 | 9 | 8 |
|---|---|---|---|---|---|---|---|---|
| desktop | 86% | 83% | 78% | 72% | 53% | 49% | 36% | 34% |
| touch | 70% | 72% | 69% | 63% | 40% | 33% | 27% | 21% |

Touch is 8-16pp behind at every tolerance. Because a level samples anywhere in its band, the honest measure of a level is its worst case — the lowest tolerance it can draw. Desktop's worst case at L3, the ordinary ceiling, is 34%; touch reaches that same rate at tolerance 10, which is L2's worst case. Capping touch at L2 therefore gives a touch user the same worst-case chance a desktop user already gets at the ceiling.

`MAX_AUTO_ESCALATION_LEVEL_TOUCH` and `resolveMaxEscalationLevel(siteMaxLevel, isTouch)` are new in `@prosopo/captcha-severity`. The resolver takes the stricter of the site's own `puzzleMaxDifficulty` and the device ceiling, so a site set to 3 or 4 cannot out-vote the touch ceiling and a site pinned to 0 is not raised by it.

The provider now calls it from both places a puzzle difficulty is chosen: `sendCaptcha`, which reads `routingContext.platform.isMobile`, and the post-PoW escalation in `submitPoWCaptchaSolution`, which derives the platform from the originating session. That second path previously ignored the site's `puzzleMaxDifficulty` entirely and always clamped to the global ceiling; it now respects both caps.

Desktop behaviour is unchanged, and L4 stays unreachable by automatic escalation on either device.

See prosopo/captcha-private#5087 for the measurement this came from, including the customer complaint that prompted it.
