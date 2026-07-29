# @prosopo/locale

## 3.2.7
### Patch Changes

- b500d56: fix(widget): enforce single language across widget, kill browser/config race
  
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

## 3.2.6
### Patch Changes

- f9e8c94: chore(deps): bump i18next-fs-backend from 2.6.0 to 2.6.6

## 3.2.5
### Patch Changes

- edcd450: Validate salt-encoded coords in PoW and puzzle verification and add a `CAPTCHA_INVALID_SALT` result reason. Invalid input now produces a disapproval rather than a partial write.

## 3.2.4
### Patch Changes

- 5786629: fix(provider): persist DISALLOWED_WEBVIEW outcome and broaden detection in image captcha verify
  
  The webview check in `verifyImageCaptchaSolution` did an early return that
  left the commitment stuck at `Approved` in the database and never marked
  the session as `serverChecked` / `disapproved`, even though the API
  correctly returned `verified: false`. This made the DB state misleading
  and broke any downstream consumer reading commitment status directly.
  
  The check also only fired when `scoreComponents.webView > 0`, which is
  only set when the frictionless flow took the webview branch. Webview
  users who reached the image captcha via another branch (UA mismatch,
  context-aware failure, timestamp, bot score) had `session.webView: true`
  but no `scoreComponents.webView`, so the verify-time block missed them.
  
  - Convert the early return to the same `failStatus` /
    `commitmentUpdates.result` pattern used by every other check in the
    function, so the commitment and session are properly persisted as
    disapproved with reason `DISALLOWED_WEBVIEW`.
  - Trigger on `session.webView === true` OR `scoreComponents.webView > 0`.
  - Add `ResultReason.DISALLOWED_WEBVIEW` and the English locale entry.
  - Add unit tests for score-based detection, boolean-only detection, and
    the `disallowWebView=false` passthrough.
  
  Closes #3396.

## 3.2.3
### Patch Changes

- 53bfd45: Detect when the widget is served over plain HTTP (an insecure browser context)
  and show a clear "Procaptcha requires a secure (HTTPS) connection" message
  instead of failing later with a cryptic `Provider Selection Failed` error.
  Procaptcha depends on secure-context-only browser APIs (e.g. SubtleCrypto), so
  the frictionless widget now short-circuits before the provider-selection retry
  loop when `window.isSecureContext` is false. Adds the `WIDGET.INSECURE_CONTEXT`
  translation key across all locales and an `isSecureBrowserContext` helper.

## 3.2.2
### Patch Changes

- 4aae4e6: Guard the `process.env` reads in `i18nSharedOptions` and `version` so both
  packages are loadable in a plain browser runtime (e.g. Vite dev/preview
  servers) where `process` is undefined. Without the guard, any consumer that
  side-effectfully imports `@prosopo/types` — which transitively reaches
  `@prosopo/locale` via `LanguageSchema` — would crash the page with
  `ReferenceError: process is not defined`.

## 3.2.1
### Patch Changes

- b94890c: Translations

## 3.2.0
### Minor Changes

- 42650db: Add better spam rules and move ipinfo service to local instead of external

### Patch Changes

- fc514dd: ability to block different types of traffic

## 3.1.29
### Patch Changes

- adb89a6: Disposable email checking

## 3.1.28
### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- fe9fe22: adding api returns
- 3acc333: Release 3.3.0

## 3.1.27
### Patch Changes

- e01227b: add turbo

## 3.1.26
### Patch Changes

- 7d5eb3f: bump

## 3.1.25
### Patch Changes

- 93d92a7: little bump for publish all

## 3.1.24
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep

## 3.1.23
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23

## 3.1.22
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/config@3.1.22

## 3.1.21
### Patch Changes

- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21

## 3.1.20
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20

## 3.1.19
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/config@3.1.19

## 3.1.18
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [50c4120]
  - @prosopo/config@3.1.18

## 3.1.17
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
  - @prosopo/config@3.1.17

## 3.1.16
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
  - @prosopo/config@3.1.16

## 3.1.15
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
  - @prosopo/config@3.1.15

## 3.1.14
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/config@3.1.14

## 3.1.13
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [008d112]
  - @prosopo/config@3.1.13

## 3.1.12
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [0824221]
  - @prosopo/config@3.1.12

## 3.1.11
### Patch Changes

- 0d1a33e: Adding ipcomparison service with user features
- 1a23649: Release 3.2.3
- Updated dependencies [1a23649]
  - @prosopo/config@3.1.11

## 3.1.10
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/config@3.1.10

## 3.1.9
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [809b984]
  - @prosopo/config@3.1.9

## 3.1.8
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [6fe8570]
  - @prosopo/config@3.1.8

## 3.1.7
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
  - @prosopo/config@3.1.7

## 3.1.6
### Patch Changes

- Updated dependencies [9eed772]
  - @prosopo/config@3.1.6

## 3.1.5
### Patch Changes

- d8e855c: Adding checks for IP consistency throughout the verification process
- 6960643: lint detect missing and unneccessary imports

## 3.1.4
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5

## 3.1.3
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4

## 3.1.2
### Patch Changes

- 91bbe87: configure typecheck before bundle for vue packages
- 91bbe87: make typecheck script always recompile
- 346e092: NODE_ENV default to "development"
- 5d36e05: remove tsc --force
- Updated dependencies [828066d]
- Updated dependencies [91bbe87]
- Updated dependencies [3ef4fd2]
- Updated dependencies [91bbe87]
- Updated dependencies [346e092]
- Updated dependencies [5d36e05]
  - @prosopo/config@3.1.3

## 3.1.1
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/config@3.1.2

## 3.1.0
### Minor Changes

- f29fc7e: Refining API error handling. Adding more language strings

### Patch Changes

- 93d5e50: ensure packages have @prosopo/config as dep for vite configs
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 93d5e50: fix missing dep for @prosopo/config
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/config@3.1.1

## 3.0.2
### Patch Changes

- f682f0c: Moving type and fixing i18n config

## 3.0.1
### Patch Changes

- 87bd9bc: Allow non-explicit languages

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied
