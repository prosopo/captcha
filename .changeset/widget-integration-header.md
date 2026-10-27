---
"@prosopo/types": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-icon-order": patch
---

The widget now tells the provider which platform embedded it, in an `x-prosopo-integration` header. It reports `mc4wp` for Mailchimp for WordPress and `procaptcha-wordpress` for the Procaptcha WordPress plugin, recognised from the markup each one renders the widget into, so existing installs report without an update. Other sites can name themselves with the `integration` render option or a `data-integration` attribute.
