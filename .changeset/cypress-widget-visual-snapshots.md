---
"@prosopo/cypress-shared": patch
---

The image, frictionless and PoW cypress specs now take a visual snapshot of the captcha widget at its key states (before clicking, after passing, after failing) and compare it against committed baselines in chrome. Snapshots are cropped to the widget so the demo page around it can't make them flaky.
