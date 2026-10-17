# @prosopo/procaptcha-audio

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
