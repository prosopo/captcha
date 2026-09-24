# @prosopo/common

## 3.1.59
### Patch Changes

- a9141c3: Stop shipping i18next to the browser. Saves about 22KB gzipped off the widget.
  
  The widget was pulling in i18next and four of its plugins — a language detector, an HTTP backend, a chained backend and a resources-to-backend adapter, which between them also dragged in the `cross-fetch` polyfill — to look up 444 short strings with no plurals, no nesting and two interpolated values. That machinery is about 23KB gzipped; the replacement is 1.25KB.
  
  `i18nFrontend.ts` now does the job directly: pick a language, fetch the matching `locales/<lang>/translation.json` next to the bundle, and look keys up in it. Behaviour is unchanged in the ways a visitor can see:
  
  - language is chosen from the widget's own setting first, then a cookie, then localStorage, then the browser — the same order as before, and the choice is still remembered in both cookie and localStorage
  - a regional tag like `de-AT` still resolves to `de`
  - English is still fetched alongside the chosen language, so a key a translation is missing still renders English rather than its key
  - `{{name}}` placeholders are still filled in, including in a caller's `defaultValue`
  - if the catalogue cannot be fetched the widget still renders, in English, rather than waiting
  
  i18next stays for the server, where `i18next-http-middleware` needs the real instance to read the `Accept-Language` header. `Ti18n` is now a small interface describing the handful of methods this repository actually calls, which both implementations satisfy, so `@prosopo/common` no longer needs i18next for a type either.
  
  Covered by 189 tests in `@prosopo/locale`, and the built bundle was checked in a real browser: French picked up from the browser, a switch to German, interpolation, and both fallbacks.
- a9141c3: Stop loading zod before the widget can draw itself. Takes another 13KB gzipped off the critical path.
  
  zod is 14KB gzipped and it was being downloaded and parsed before the checkbox appeared, because six small things on the startup path happened to use it:
  
  - two lists of strings in `@prosopo/logger` (log levels, output format)
  - two lists of strings in `@prosopo/locale` (language codes, translation keys)
  - two lists of two strings in `@prosopo/types` (start mode, challenge placement)
  - one four-field object in `@prosopo/load-balancer` (a provider entry)
  - an `instanceof ZodError` check in `@prosopo/common`
  - `INPUT_LIMITS`, a plain table of numbers, that happened to live in the same file as zod-based string builders
  
  None of these need a validation library. They are now plain TypeScript: a list, a type, and where input is untrusted, a one-line guard. `INPUT_LIMITS` moved to its own file so reading it no longer drags the builders along.
  
  zod has not gone anywhere — the real request and response schemas in `@prosopo/types` still use it, and still validate exactly as before. It now arrives with the code that needs it, after the widget is on screen, rather than in front of it.
  
  Two API changes for anyone importing these directly:
  
  - `LanguageSchema`, `TranslationKeysSchema`, `StartModeSchema` and `Placement` are no longer exported as zod schemas. Use `isLanguage()`, `isStartMode()`, `isPlacement()` to check a value, and `LanguageCodes`, `translationKeys`, `StartModes`, `Placements` for the lists.
  - `isZodError()` now recognises a zod error by its name rather than `instanceof`. That is strictly more tolerant: the name still matches when an error crosses a realm boundary or comes from a second copy of zod, which `instanceof` misses — it was already the fallback arm of the same check.
  
  Two behaviour notes: a malformed entry in the fetched provider list now throws a plain `Error` naming the entry, where it used to throw an untranslated zod error; and the language codes accepted are unchanged.
  
  Covered by the existing suites for every package touched (types, types-database, locale, logger, common, load-balancer, all five procaptcha packages, api, cli, api-express-router, server, and the provider's 1322 unit tests), all passing. The built bundle was also loaded in a real browser: the widget renders from the first eight chunks, zod arrives in the second wave, and the provider's error came back translated into German.
- Updated dependencies [a9141c3]
- Updated dependencies [a9141c3]
  - @prosopo/locale@3.6.0
  - @prosopo/logger@2.1.0

## 3.1.58
### Patch Changes

- Updated dependencies [59c02da]
  - @prosopo/locale@3.5.0

## 3.1.57
### Patch Changes

- Updated dependencies [a22069d]
  - @prosopo/locale@3.4.4

## 3.1.56
### Patch Changes

- f4e4a83: chore(deps): roll up the open dependabot bumps (react 19.3, mongoose 9.10, @polkadot/util 14, redis 6, cron-parser 5, react-i18next 17 with i18next 26, @scure/base 2, cypress 16, rollup/babel plugin majors, vitest 4.1.11, angular 20.3.28, js-yaml)
- Updated dependencies [f4e4a83]
- Updated dependencies [d710b7f]
  - @prosopo/locale@3.4.3
  - @prosopo/logger@2.0.10

## 3.1.55
### Patch Changes

- Updated dependencies [864ddde]
  - @prosopo/locale@3.4.2

## 3.1.54
### Patch Changes

  - @prosopo/logger@2.0.9

## 3.1.53
### Patch Changes

- 89dd38a: chore(deps): batch the outstanding dependabot bumps into one upgrade
  
  Rolls up dependabot PRs #3112, #3127-#3134 and #3159. Majors: `mongoose`
  8 -> 9, `bson` 6 -> 7, `@noble/curves` 1 -> 2, `@polkadot/util-crypto`
  13 -> 14, `@typegoose/auto-increment` 4 -> 5, `@babel/preset-env` 7 -> 8,
  `@types/jsdom` 21 -> 30, `@types/bcrypt` 5 -> 6, `@actions/github` 6 -> 9,
  `testcontainers` 11 -> 12. The rest are minor/patch.
  
  Code changes the majors forced:
  - `@noble/curves` v2 requires `.js` specifiers and renamed the point API,
    so `secp256k1.ProjectivePoint.fromHex(...).toRawBytes()` becomes
    `secp256k1.Point.fromBytes(...).toBytes()`, `RistrettoPoint` becomes
    `ristretto255.Point`, and `abstract/utils` moves to `utils.js`.
  - mongoose 9 drops `RootFilterQuery` (now `QueryFilter`), no longer sets
    `background: true` on schema indexes by default, and no longer declares
    `id` on `Document`, which un-hid a mismatch between
    `updateDappUserCommitment`'s `Hash` parameter and the `string` `id` it
    filters on.
  - mongoose 9 rejects an aggregation-pipeline update (an array) unless the
    call passes `updatePipeline: true`, so the six pipeline writes in
    `ProviderDatabase` now opt in explicitly.
  - mongoose 9's `castUpdate` throws on a `$setOnInsert` key inside `$set`.
    `storeUserImageCaptchaSolution` passed its record straight in as the
    update, and mongoose's `moveImmutableProperties` mutates that object on
    an upsert -- adding the very `$setOnInsert` key the record then carried
    into `CentralDbStreamer.streamImageRecord`. Image records stopped
    reaching the central DB (the streamer is fire-and-forget, so it only
    logged) and signup verification returned 500. The update is now an
    explicit `$set` over a shallow copy.
  - `@prosopo/database` moves from mongodb 6.20 to 7.5 to match the driver
    mongoose 9 pulls, so bson 7 is the only copy resolvable in the package.
  - `vitest`/`@vitest/coverage-v8` go to 4.1.11 alongside dependabot's
    `@vitest/spy` bump; leaving them at 4.1.10 installed a second copy of
    `@vitest/spy` and broke type inference in the provider test utils.
- Updated dependencies [89dd38a]
  - @prosopo/locale@3.4.1
  - @prosopo/logger@2.0.8

## 3.1.52
### Patch Changes

- Updated dependencies [4b1cb19]
  - @prosopo/locale@3.4.0

## 3.1.51
### Patch Changes

- Updated dependencies [68a9b41]
  - @prosopo/locale@3.3.1
  - @prosopo/logger@2.0.7

## 3.1.50
### Patch Changes

- Updated dependencies [9091a78]
  - @prosopo/locale@3.3.0
  - @prosopo/logger@2.0.6

## 3.1.49
### Patch Changes

- 9fec7bd: test(logger): cover level dispatch, format guard and browser output
- Updated dependencies [2aabe73]
- Updated dependencies [bcef918]
  - @prosopo/logger@2.0.5
  - @prosopo/locale@3.2.9

## 3.1.48
### Patch Changes

- e14fce6: chore(deps): bump vite to 6.4.3 and mongoose to 8.24.1, and adjust types for the mongoose 8.24 Document/ObjectId changes
- Updated dependencies [0e1171c]
- Updated dependencies [e14fce6]
  - @prosopo/locale@3.2.8
  - @prosopo/logger@2.0.4

## 3.1.47
### Patch Changes

- fde6896: fix(user-access-policy,common,provider): quiet two high-volume log spammers
  
  - `user-access-policy`: switch the split-query sub-probes from `FT.AGGREGATE + LOAD @__key` to `FT.SEARCH NOCONTENT`. The aggregate reply path in `@redis/client` 5.x can throw on a null result row and the sub-query then silently returns `[]`; the NOCONTENT reply shape doesn't have that failure mode. Removes ~2k error logs per hour without changing lookup semantics.
  - `common`: `ProsopoBaseError` auto-logs now carry a `msg` field (mirroring the translation key). Previously every auto-logged error landed in the "undefined msg" bucket in log dashboards (~800/hour).
  - `provider`: add the missing `msg` on the image-verify catch that emits the same pattern.

## 3.1.46
### Patch Changes

- Updated dependencies [b500d56]
  - @prosopo/locale@3.2.7

## 3.1.45
### Patch Changes

- Updated dependencies [6abff15]
  - @prosopo/logger@2.0.3

## 3.1.44
### Patch Changes

  - @prosopo/logger@2.0.2

## 3.1.43
### Patch Changes

- Updated dependencies [f9e8c94]
  - @prosopo/locale@3.2.6

## 3.1.42
### Patch Changes

  - @prosopo/logger@2.0.1

## 3.1.41
### Patch Changes

- dfb0c53: fix: derive HTTP status message from actual status code
  
  `unwrapError` hardcoded `statusMessage = "Bad Request"` regardless of the resolved status code, so 401/403/500 responses (copied onto `response.statusMessage` by `errorHandler`) carried the wrong reason phrase. The reason phrase is now derived from the final status code via a local `STATUS_MESSAGES` map (a subset of `node:http`'s `STATUS_CODES`, kept local so this module stays browser-bundle compatible; unmapped codes fall back to a reason phrase by class — 5xx to "Internal Server Error", otherwise "Bad Request").
- 11f1e8c: Replace vague logger scopes (empty strings, import.meta.url, generic "CLI") with structured colon-delimited names following the convention package:subsystem:action.
- Updated dependencies [7ebb78f]
- Updated dependencies [948d36b]
- Updated dependencies [41e0e11]
- Updated dependencies [3c80664]
  - @prosopo/logger@2.0.0

## 3.1.40
### Patch Changes

- Updated dependencies [edcd450]
  - @prosopo/locale@3.2.5
  - @prosopo/logger@1.0.4

## 3.1.39
### Patch Changes

  - @prosopo/logger@1.0.3

## 3.1.38
### Patch Changes

- Updated dependencies [97cf7bd]
- Updated dependencies [6ca1125]
- Updated dependencies [32a591b]
  - @prosopo/logger@1.0.2

## 3.1.37
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.
- Updated dependencies [0fd81af]
  - @prosopo/logger@1.0.1

## 3.1.36
### Patch Changes

- Updated dependencies [5786629]
  - @prosopo/locale@3.2.4

## 3.1.35
### Patch Changes

- Updated dependencies [53bfd45]
  - @prosopo/locale@3.2.3

## 3.1.34
### Patch Changes

- 4993813: Standardise provider error logging so every error is queryable via a single
  top-level `err` field, and so the logged value is the locale-stable
  translation key (e.g. `CAPTCHA.NO_SESSION_FOUND`) rather than the translated
  message text (`"No session found"`, `"Aucune session trouvée"`, etc.).
  
  - `ProsopoBaseError.logError()` now emits `{ err: translationKey, data: { errorType, context } }` instead of `{ data: { errorType, errorParams: { error, context } } }`. OpenObserve queries can drop `data_errorparams_error` and `data_errorparams_context_translationmessage`.
  - The redundant `translationMessage` injection into wrapped-error context is removed (it was the source of the locale-variant strings).
  - `NativeLogger.unpackError()` prefers `e.translationKey` over `e.message` when surfacing an error via `logger.error(() => ({ err }))`, so catch-and-log sites are standardised automatically.
  - Removed two `console.error` calls in `verify.ts` and an accidental debug `console.log(JSON.stringify(effectiveRules, null, 2))` in `util.ts` that were both bypassing `req.logger` (no `requestId`, and in the JSON dump case exploding into ~20 separate log entries per call).
  - HTTP response shape is unchanged: `unwrapError()` still uses `i18n.t(err.message)` for the response body, and `jsonError.key` still carries the translation key for clients.
- Updated dependencies [4aae4e6]
  - @prosopo/locale@3.2.2

## 3.1.33
### Patch Changes

- Updated dependencies [b94890c]
  - @prosopo/locale@3.2.1

## 3.1.32
### Patch Changes

- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/locale@3.2.0

## 3.1.31
### Patch Changes

- 4a9c518: fix/catcher-demo-vitest

## 3.1.30
### Patch Changes

- Updated dependencies [adb89a6]
  - @prosopo/locale@3.1.29

## 3.1.29
### Patch Changes

- c5ee492: fix/portal-traffic-report

## 3.1.28
### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 3acc333: Release 3.3.0
- Updated dependencies [0a38892]
- Updated dependencies [a8faa9a]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/locale@3.1.28

## 3.1.27
### Patch Changes

- Updated dependencies [e01227b]
  - @prosopo/locale@3.1.27

## 3.1.26
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/locale@3.1.26

## 3.1.25
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/locale@3.1.25

## 3.1.24
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/locale@3.1.24

## 3.1.23
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/locale@3.1.23

## 3.1.22
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/locale@3.1.22
  - @prosopo/config@3.1.22

## 3.1.21
### Patch Changes

- c9d8fdf: feat/access-policy-group
- b8185a4: feat/uap-rules-syncer
- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21
  - @prosopo/locale@3.1.21

## 3.1.20
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/locale@3.1.20

## 3.1.19
### Patch Changes

- f912439: Replace `any` type with `unknown` in BaseContextParams error context for improved type safety
- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/locale@3.1.19
  - @prosopo/config@3.1.19

## 3.1.18
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [50c4120]
  - @prosopo/locale@3.1.18
  - @prosopo/config@3.1.18

## 3.1.17
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
  - @prosopo/locale@3.1.17
  - @prosopo/config@3.1.17

## 3.1.16
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
  - @prosopo/locale@3.1.16
  - @prosopo/config@3.1.16

## 3.1.15
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
  - @prosopo/locale@3.1.15
  - @prosopo/config@3.1.15

## 3.1.14
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/locale@3.1.14
  - @prosopo/config@3.1.14

## 3.1.13
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [008d112]
  - @prosopo/locale@3.1.13
  - @prosopo/config@3.1.13

## 3.1.12
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [0824221]
  - @prosopo/locale@3.1.12
  - @prosopo/config@3.1.12

## 3.1.11
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/config@3.1.11

## 3.1.10
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/locale@3.1.10
  - @prosopo/config@3.1.10

## 3.1.9
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [809b984]
  - @prosopo/locale@3.1.9
  - @prosopo/config@3.1.9

## 3.1.8
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [6fe8570]
  - @prosopo/locale@3.1.8
  - @prosopo/config@3.1.8

## 3.1.7
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
  - @prosopo/locale@3.1.7
  - @prosopo/config@3.1.7

## 3.1.6
### Patch Changes

- Updated dependencies [9eed772]
  - @prosopo/config@3.1.6
  - @prosopo/locale@3.1.6

## 3.1.5
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/locale@3.1.5

## 3.1.4
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/locale@3.1.4
  - @prosopo/util-crypto@13.5.6

## 3.1.3
### Patch Changes

- a49b538: Extra tests
- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/locale@3.1.3
  - @prosopo/util-crypto@13.5.5

## 3.1.2
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
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
  - @prosopo/util-crypto@13.5.4
  - @prosopo/locale@3.1.2

## 3.1.1
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/util-crypto@13.5.3
  - @prosopo/locale@3.1.1
  - @prosopo/config@3.1.2

## 3.1.0
### Minor Changes

- f29fc7e: Refining API error handling. Adding more language strings

### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [8a64429]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
- Updated dependencies [6d604ad]
  - @prosopo/util-crypto@13.5.2
  - @prosopo/locale@3.1.0
  - @prosopo/config@3.1.1

## 3.0.2
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/locale@3.0.2

## 3.0.1
### Patch Changes

- Updated dependencies [87bd9bc]
  - @prosopo/locale@3.0.1

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/locale@3.0.0

## 2.7.2
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/util-crypto@13.5.1

## 2.7.1
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/util-crypto@13.5.0

## 2.7.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/util-crypto@13.4.0

## 2.6.1

### Patch Changes

- 04cc7ee: Use ASCII characters for HTTP status message

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/locale@2.6.0
