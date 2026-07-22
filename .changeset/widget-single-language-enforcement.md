---
"@prosopo/locale": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-frictionless": patch
---

fix(widget): enforce single language across widget, kill browser/config race

`WidgetFactory.getCaptchaRenderer()` booted the i18n singleton with the
browser-detected language before the site-owner `renderOptions.language` /
`data-language` had been resolved, and each widget then called
`i18n.changeLanguage(config.language)` from a post-mount effect. Any child
component that read `useTranslation()` between first render and the async
`changeLanguage` resolution rendered in the browser language, then re-rendered
in the site-owner language — the multi-language flash customers reported.

Resolve the site-owner language in `WidgetFactory.createWidget()` before the
lazy renderer load and thread it into `loadI18next(false, lng)`, so the
singleton boots (or reconciles via `changeLanguage` + await) with the correct
language before React mounts. Site-owner language wins; falls back to browser
detection only when no `language` / `data-language` is set.
