# @prosopo/procaptcha-audio

## 0.2.10
### Patch Changes

- 2086040: Each kind of build now writes to its own folder under dist: dist/esm (vite ESM), dist/cjs (vite CommonJS), dist/types (declarations), dist/tsc (plain tsc), dist/bundle and dist/bundle-webpack (bundles) and dist/native (the Rust addons). Turbo caches each folder separately, so building one variant no longer overwrites or invalidates another. Package exports point at the new folders; anything importing a file from dist by path has to add the variant folder.
  
  The Rust addons are no longer committed. They are built into dist/native, in debug for development and tests and fully optimised when NODE_ENV=production, so building them now needs a Rust toolchain.
  
  Code that found the repo root or its certificates by climbing a fixed number of folders up from its own file now starts from its package's folder instead (new `packageDir` in @prosopo/util/node). The fixed count stopped working once the build output moved one folder deeper.
- Updated dependencies [2086040]
- Updated dependencies [915f30b]
  - @prosopo/api@4.7.7
  - @prosopo/common@3.3.1
  - @prosopo/locale@3.13.1
  - @prosopo/procaptcha-common@2.21.9
  - @prosopo/types@5.19.0
  - @prosopo/util-crypto@13.6.2
  - @prosopo/util@3.3.17
  - @prosopo/widget-skeleton@2.10.4

## 0.2.9
### Patch Changes

- Updated dependencies [b460b0b]
- Updated dependencies [159766a]
- Updated dependencies [96dbf9a]
  - @prosopo/locale@3.13.0
  - @prosopo/types@5.18.0
  - @prosopo/procaptcha-common@2.21.8
  - @prosopo/api@4.7.6
  - @prosopo/common@3.3.0

## 0.2.8
### Patch Changes

- Updated dependencies [49892fc]
  - @prosopo/locale@3.12.1
  - @prosopo/types@5.17.1
  - @prosopo/api@4.7.5
  - @prosopo/common@3.3.0
  - @prosopo/procaptcha-common@2.21.7

## 0.2.7
### Patch Changes

- 46b97b7: Roll up the open Dependabot updates: express 5 (with `@types/express` 5), dotenv 18, undici 8, geolib 4, vitest 5, vite 8.1.6 everywhere, 17 minor and patch bumps (Babel, mongoose, i18next, ip-address, turbo and others), `@angular/router` in the Angular demo, and a GitHub Actions bump.
  
  The whole vitest family moves to 5.0.4, including `@vitest/coverage-v8`, because `@vitest/browser-playwright` 5 only works with vitest 5. The `@types/express-serve-static-core` override moves to 5.1.3 to match `@types/express` 5.
  
  `@prosopo/dotenv` now loads env files with `quiet: true`. Since dotenv 17, every load prints an "injected env" line to stderr unless told not to.
- d2148c8: Errors now carry a fixed code and a site instead of a translation key.
  
  Every error is a `ProsopoError` with a `code` from one list in
  `@prosopo/common` (`ERROR_CODES`) and an `errorSite` such as `PROV-12`, which
  names the one place it was thrown. Together they make the `errorId`, e.g.
  `SITE_KEY_INVALID:PROV-31`, which the widget shows after the message so a
  screenshot is enough to find the throw.
  
  What a client sees:
  
  - A public error (bad site key, blocked network, and so on) sends its code,
    English message, data and errorId.
  - Anything else sends only `BACKEND_ERROR:<site>` (or `FRONTEND_ERROR:<site>`
    from the widget) and a status. Internal details never leave the server.
  
  The provider no longer translates errors. The widget looks up
  `ERRORS.<CODE>` in its catalogue and falls back to the English message. The
  old error classes (`ProsopoApiError`, `ProsopoEnvError` and the rest), the
  `key`/`messageEn` fields and `localiseErrorMessage` are gone.
  
  Other changes in behaviour:
  
  - An error with no specific code is a hidden 500.
  - Errors no longer log themselves when they are created. The server logs each
    unhandled one once: 5xx as errors, 4xx at debug.
  - An invalid PoW signature is a 401 instead of a 500.
  - `stringifyBigInts` returns a copy instead of changing its input, so frozen
    error context can be logged.
  - The provider's last hand-written error replies now use the same error body.
    These were the missing-header 401s, the access-policy block, autoBan, the
    metrics 401/403 and the rate limiter. The rate limiter answers with a new
    public `RATE_LIMITED` (429) code.
- Updated dependencies [f31f0d5]
- Updated dependencies [46b97b7]
- Updated dependencies [d2148c8]
- Updated dependencies [2bcf2fe]
  - @prosopo/widget-skeleton@2.10.3
  - @prosopo/api@4.7.4
  - @prosopo/common@3.3.0
  - @prosopo/locale@3.12.0
  - @prosopo/procaptcha-common@2.21.6
  - @prosopo/types@5.17.0
  - @prosopo/util@3.3.16
  - @prosopo/util-crypto@13.6.1

## 0.2.6
### Patch Changes

- Updated dependencies [b6e9459]
- Updated dependencies [a5c953d]
  - @prosopo/locale@3.11.1
  - @prosopo/widget-skeleton@2.10.2
  - @prosopo/common@3.2.3
  - @prosopo/types@5.16.3
  - @prosopo/procaptcha-common@2.21.5
  - @prosopo/api@4.7.3
  - @prosopo/util@3.3.15
  - @prosopo/util-crypto@13.6.0

## 0.2.5
### Patch Changes

- Updated dependencies [49e9385]
- Updated dependencies [03df637]
  - @prosopo/locale@3.11.0
  - @prosopo/types@5.16.2
  - @prosopo/common@3.2.2
  - @prosopo/api@4.7.2
  - @prosopo/procaptcha-common@2.21.4

## 0.2.4
### Patch Changes

- Updated dependencies [e841741]
  - @prosopo/locale@3.10.1
  - @prosopo/common@3.2.1
  - @prosopo/types@5.16.1
  - @prosopo/api@4.7.1
  - @prosopo/procaptcha-common@2.21.3

## 0.2.3
### Patch Changes

- 6b11b15: The widget now tells the provider which language to use, so the challenge text comes back in the user's language.
  
  - The widget sends its language in a `Prosopo-Lang` header on every provider request. It uses the site's `data-language` if set, otherwise the browser's languages. The browser's own `Accept-Language` is left untouched, so bot detection still sees the real value.
  - `data-language` may list several codes (`"xx, tr"`). The first one we support wins. If none are supported, the widget uses the browser's language instead of English.
  - The provider picks `?lng=`, then `Prosopo-Lang`, then `Accept-Language`, then English.
  - A variant uses its parent's catalogue (`zh-SG` → `zh`, `pt-PT` → `pt`). Traditional Chinese (`zh-TW`, `zh-HK`, `zh-Hant`) skips the Simplified `zh` catalogue and moves on to the reader's next language. `nb`/`nn` map to `no`, `in` to `id` and `jw` to `jv`.
  - The widget no longer reads or writes an `i18next` cookie or local storage key on the host site.
  - `ApiClient`/`ProviderApi` take optional default headers as a 4th constructor argument.
- f8eddf7: Split each language's catalogue into `widget.json`, `target.json` and `translation.json`. The widget bundles English and downloads only the active language's `widget.json`. The provider loads all three. Server i18n now finishes loading every file before it reports ready. Removed two broken, unused scripts (`findUnused`, `testImport`) and the dependencies only they used.
- Updated dependencies [eb99b3d]
- Updated dependencies [f3f7243]
- Updated dependencies [cbb6a10]
- Updated dependencies [4961a7e]
- Updated dependencies [b351896]
- Updated dependencies [f8eddf7]
- Updated dependencies [aec7857]
- Updated dependencies [0bd0230]
- Updated dependencies [6b11b15]
- Updated dependencies [f8eddf7]
- Updated dependencies [1634139]
  - @prosopo/locale@3.10.0
  - @prosopo/types@5.16.0
  - @prosopo/common@3.2.0
  - @prosopo/api@4.7.0
  - @prosopo/procaptcha-common@2.21.2

## 0.2.2
### Patch Changes

- Updated dependencies [1f36456]
- Updated dependencies [0e02b4b]
  - @prosopo/types@5.15.1
  - @prosopo/util@3.3.15
  - @prosopo/procaptcha-common@2.21.1
  - @prosopo/api@4.6.1
  - @prosopo/common@3.1.65
  - @prosopo/locale@3.9.1
  - @prosopo/util-crypto@13.6.0
  - @prosopo/widget-skeleton@2.10.1

## 0.2.1
### Patch Changes

- Updated dependencies [4570692]
  - @prosopo/procaptcha-common@2.21.0
  - @prosopo/api@4.6.0
  - @prosopo/types@5.15.0
  - @prosopo/locale@3.9.0
  - @prosopo/common@3.1.64

## 0.2.0
### Minor Changes

- b299a91: An audio challenge, offered only as an accessibility alternative, like reCAPTCHA's audio option. The user hears a short sequence of spoken digits and types them in.
  
  It is off by default and needs two switches. Prosopo has to turn on the `captchaTypeFeatureFlags.audio` feature flag for the site, which the site owner cannot do, and the site owner has to set `audioAccessibilityEnabled`. When both are on, image, puzzle and icon-order challenges show a "Use audio instead" button. Pressing it swaps the visual challenge for the audio one. After a wrong answer the user stays on audio and gets a fresh clip.
  
  Audio is never a captcha type that can be selected or routed to. A site's `captchaType`, traffic-filter categories, Restrict rules and the site-key CLI all reject it, and routing, PoW escalation and the severity tiers leave it out. The provider only serves audio against the visual session the user was already given, and only on a site with both switches on; any other audio request is refused before the session is used up, and a request without a session is always refused.
  
  The spoken digits are synthesised by `@prosopo/audio-assets`, so there is no recorded set of clips to collect. The answer never leaves the provider, and a challenge can be submitted and verified only once, even under concurrent requests. `@prosopo/procaptcha-audio` is the widget. It and the "Use audio instead" button are built on the shared widget code in `@prosopo/procaptcha-common`, and the provider side is built on the shared interactive-captcha code that puzzle and icon-order use.
  
  The demo playground has audio pages, and there is an end-to-end test for it.

### Patch Changes

- Updated dependencies [b299a91]
- Updated dependencies [e13d7a8]
- Updated dependencies [270395d]
  - @prosopo/types@5.14.0
  - @prosopo/api@4.5.0
  - @prosopo/procaptcha-common@2.20.0
  - @prosopo/locale@3.8.0
  - @prosopo/common@3.1.63
