---
"@prosopo/provider": patch
---

Run the `getMaintenanceMode()` short-circuit before constructing `Tasks` in every captcha and verify handler. The `Tasks` constructor calls `env.getDb()`, which throws synchronously when `env.db` is undefined (the maintenance-mode case), so the existing short-circuits were unreachable and the provider was throwing `db not setup! Please call isReady() first` on every request the moment maintenance mode was toggled on. Also adds a maintenance-mode bypass to `getImageCaptchaChallenge` (empty-captchas response, mirroring the existing `submitImageCaptchaSolution` shape) and `checkSpamEmail` (`isSpam: false`) so those endpoints stay usable while Mongo is unavailable.
