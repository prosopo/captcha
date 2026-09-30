---
"@prosopo/locale": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
---

Provider errors shown in the widget now use the widget's configured language. The provider translates errors into the browser's language, so a German widget in an English browser showed English errors. The widget now translates the error key itself and keeps the provider's text only for errors its catalogue does not know.
