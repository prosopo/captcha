---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/provider": patch
---

Send page scroll events with the captcha's behavioural data.

The widget now passes a fourth collector, the page's scroll position and the
time of each scroll, alongside mouse, touch and click data, and the provider
stores it as `c4` on the captcha record. People scroll in uneven bursts while
bots tend to scroll at a steady rate, so this gives detection something to
work with. Detector bundles that predate the scroll tracker simply send no
`c4`.
