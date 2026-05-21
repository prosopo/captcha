---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-common": patch
"@prosopo/locale": patch
---

Detect when the widget is served over plain HTTP (an insecure browser context)
and show a clear "Procaptcha requires a secure (HTTPS) connection" message
instead of failing later with a cryptic `Provider Selection Failed` error.
Procaptcha depends on secure-context-only browser APIs (e.g. SubtleCrypto), so
the frictionless widget now short-circuits before the provider-selection retry
loop when `window.isSecureContext` is false. Adds the `WIDGET.INSECURE_CONTEXT`
translation key across all locales and an `isSecureBrowserContext` helper.
