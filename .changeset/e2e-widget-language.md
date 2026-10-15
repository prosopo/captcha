---
"@prosopo/cypress-shared": patch
---

Add an end-to-end test that runs the image captcha in Turkish. It checks that the widget picks up the browser's language, that `data-language` beats the browser, that the first supported code in a `data-language` list wins, and that an unsupported language falls back to English, with the challenge labels coming back translated from the provider.
