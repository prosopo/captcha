# @prosopo/procaptcha-puzzle

## 2.10.34
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
- Updated dependencies [b500d56]
  - @prosopo/locale@3.2.7
  - @prosopo/common@3.1.46
  - @prosopo/types@4.9.9
  - @prosopo/api@3.5.16
  - @prosopo/procaptcha-common@2.11.13

## 2.10.33
### Patch Changes

  - @prosopo/procaptcha-common@2.11.12

## 2.10.32
### Patch Changes

  - @prosopo/procaptcha-common@2.11.11

## 2.10.31
### Patch Changes

  - @prosopo/common@3.1.45
  - @prosopo/procaptcha-common@2.11.10

## 2.10.30
### Patch Changes

- Updated dependencies [85e8857]
  - @prosopo/api@3.5.15
  - @prosopo/types@4.9.8
  - @prosopo/util@3.3.4
  - @prosopo/common@3.1.44
  - @prosopo/procaptcha-common@2.11.9

## 2.10.29
### Patch Changes

- Updated dependencies [8bde5df]
  - @prosopo/types@4.9.7
  - @prosopo/api@3.5.14
  - @prosopo/procaptcha-common@2.11.8

## 2.10.28
### Patch Changes

- b3f351b: fix(procaptcha): random provider re-selection + backoff on error fallback
  
  When a provider errored, the widget retried the same DNS-routed endpoint immediately and in a tight loop. A fleet of widgets whose provider was unhealthy could therefore accidentally DDoS the provider fleet — retrying the same (possibly-down) endpoint as fast as the event loop allowed.
  
  The error-fallback path now:
  
  - **Re-selects a different provider on retry.** The first attempt still hits the DNS-routed endpoint (unchanged happy path, preserves session stickiness). On a retry the widget picks a random provider straight from the provider list (`getRandomProviderFromList`), weighted by provider capacity and excluding the URL that just failed. In development the list holds only the single local provider, so a retry simply re-targets that provider.
  - **Backs off between retries.** `providerRetry` now waits an exponential-backoff-with-full-jitter delay (0.5s → 1s → 2s → 4s …, capped at 10s) before retrying, so a down provider is no longer hammered and a fleet of clients that all errored at once don't reconverge into a thundering herd.
  
  Applies to the image, PoW and puzzle managers and the frictionless detection flow. New shared `ProviderSelectRetryContext` type; `BotDetectionFunction` gains an optional retry-context argument.
- Updated dependencies [b3f351b]
- Updated dependencies [17bc76e]
  - @prosopo/procaptcha-common@2.11.7
  - @prosopo/types@4.9.6
  - @prosopo/api@3.5.13

## 2.10.27
### Patch Changes

- Updated dependencies [6cb3218]
  - @prosopo/types@4.9.5
  - @prosopo/api@3.5.12
  - @prosopo/procaptcha-common@2.11.6

## 2.10.26
### Patch Changes

- Updated dependencies [de12b31]
- Updated dependencies [770954b]
  - @prosopo/types@4.9.4
  - @prosopo/api@3.5.11
  - @prosopo/procaptcha-common@2.11.5

## 2.10.25
### Patch Changes

- 18d0287: fix(procaptcha-frictionless,procaptcha-pow,procaptcha-puzzle,procaptcha-react): auto-recover from `CAPTCHA.NO_SESSION_FOUND` on the inner widget without asking the user to click the checkbox a second time, and without dropping the click coordinates that would otherwise land in the solution salt as `(0, 0)`.
  
  Motivation. The in-flight dedupe added in the previous change only collapses `/captcha/{type}` POSTs that overlap in flight. A duplicate POST that fires ~1 s after the first has already settled (observed on iPhone WKWebView, incident 2026-07-01 21:23 UTC) still lands on a consumed session and returns `NO_SESSION_FOUND`. The pre-existing recovery for that case was a `setTimeout(restart, 100)` that tore the whole widget down and lost the checkbox click position.
  
  - `ProcaptchaProps` gains two optional props: `onSessionInvalidated(x?, y?)` and `startCoords: { x, y }`. Widgets not mounted under a recovery-aware parent still fall back to `frictionlessState.restart()`.
  - `procaptcha-pow`, `procaptcha-puzzle`, and `procaptcha-react` widgets now track the last `manager.start(x, y)` coords in a ref (either from the checkbox click or from `startCoords`) and, on the first `CAPTCHA.NO_SESSION_FOUND`, invoke `onSessionInvalidated(x, y)` instead of calling `restart()`. A per-instance ref makes it strictly one-shot — a second failure falls back to the existing restart path so a persistently broken session doesn't loop.
  - `ProcaptchaFrictionless` wires `onSessionInvalidated` through to each inner widget: it stashes the retry coords in a ref, re-runs its own `start()` (which re-invokes `/frictionless` and mints a fresh sessionId), then re-mounts the inner widget with `autoStart={true}` and `startCoords={x, y}`. The inner widget auto-fires `manager.start(x, y)` on mount so the eventual submit still embeds the real checkbox click position in the salt.
  - The recovery decision (one-shot fire, coord validation — `(0, 0)` and partial pairs are discarded because they're what an `autoStart` mount or an untrusted pointer event emits rather than a real click, and the consume-and-clear pending-coords ref) is extracted into `sessionInvalidatedRecovery.ts` with dedicated unit tests.
- Updated dependencies [18d0287]
  - @prosopo/types@4.9.3
  - @prosopo/api@3.5.10
  - @prosopo/procaptcha-common@2.11.4

## 2.10.24
### Patch Changes

- Updated dependencies [8814425]
  - @prosopo/api@3.5.9

## 2.10.23
### Patch Changes

- 0983c51: fix(procaptcha-pow): forward all props through the Suspense wrapper so `onEscalate` and `autoStart` reach the inner widget. The PoW (and puzzle) wrappers were enumerating props by name and silently dropping `onEscalate`, which meant the Manager closure captured `onEscalate=undefined`. When the provider returned a post-PoW escalation envelope, `onEscalate?.()` no-op'd, the frictionless wrapper was never told to swap in the image widget, and the user was left with a spinning PoW checkbox forever. Both wrappers now spread props, matching the image (`Procaptcha`) sibling.
- Updated dependencies [f9e8c94]
- Updated dependencies [7a434e0]
  - @prosopo/locale@3.2.6
  - @prosopo/types@4.9.2
  - @prosopo/common@3.1.43
  - @prosopo/api@3.5.8
  - @prosopo/procaptcha-common@2.11.3

## 2.10.22
### Patch Changes

- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/types@4.9.1
  - @prosopo/util@3.3.3
  - @prosopo/api@3.5.7
  - @prosopo/common@3.1.42
  - @prosopo/procaptcha-common@2.11.2

## 2.10.21
### Patch Changes

- Updated dependencies [dfb0c53]
- Updated dependencies [b9f5eca]
- Updated dependencies [849af99]
- Updated dependencies [6ecc576]
- Updated dependencies [a5ba27b]
- Updated dependencies [d1fbde3]
- Updated dependencies [619dc9f]
- Updated dependencies [11f1e8c]
- Updated dependencies [a26e9d0]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
- Updated dependencies [6a7b122]
  - @prosopo/common@3.1.41
  - @prosopo/util-crypto@13.5.30
  - @prosopo/util@3.3.2
  - @prosopo/widget-skeleton@2.8.4
  - @prosopo/types@4.9.0
  - @prosopo/api@3.5.6
  - @prosopo/procaptcha-common@2.11.1

## 2.10.20
### Patch Changes

- 12cd0a6: Add ipv4-only / ipv6-only provider DNS routing via `data-ipv4` / `data-ipv6`.
  
  Dapps that need to pin captcha traffic to a single IP stack can now do so:
  
  ```html
  <div class="procaptcha" data-sitekey="..." data-ipv4="true"></div>
  ```
  
  What happens under the hood:
  
  - The widget reads `data-ipv4` / `data-ipv6` (or the matching `ipv4` / `ipv6`
    booleans on `ProcaptchaRenderOptions` / explicit `render(...)`) and threads
    them through `ProcaptchaConfigSchema`.
  - `pickIpMode(config)` resolves them into an `IpMode` (`"ipv4"` / `"ipv6"` /
    `undefined`); `ipv4` wins if both are set.
  - The frictionless / image / pow / puzzle managers pass the `IpMode` into
    `getProcaptchaRandomActiveProvider`, which calls `/healthz` on the matching
    single-stack global hostname (`ipv4.pronode.prosopo.io` or
    `ipv6.pronode.prosopo.io`) and pins subsequent captcha calls to
    `ipv4.pronodeN.prosopo.io` / `ipv6.pronodeN.prosopo.io`. The dual-stack
    cache and the single-stack caches are kept separate.
  - `convertHostedProvider` now accepts an optional `IpMode` and, when set,
    selects the matching `ipv4` / `ipv6` sub-object from the provider-list JSON.
    Top-level `ipv4` / `ipv6` keys are skipped by default so existing dual-stack
    callers keep working.
  - New helpers in `@prosopo/load-balancer`: `IpMode`, `stripIpModeLabel`,
    `getProviderHostname`.
  
  Coordinated with the matching `captcha-private` change that publishes the
  `ipv4` / `ipv6` sub-objects to S3.
- Updated dependencies [12cd0a6]
- Updated dependencies [12cd0a6]
  - @prosopo/procaptcha-common@2.11.0
  - @prosopo/api@3.5.5
  - @prosopo/types@4.8.0

## 2.10.19
### Patch Changes

- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4
  - @prosopo/api@3.5.4
  - @prosopo/procaptcha-common@2.10.28

## 2.10.18
### Patch Changes

- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/api@3.5.3
  - @prosopo/procaptcha-common@2.10.27

## 2.10.17
### Patch Changes

- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/util@3.3.1
  - @prosopo/types@4.7.2
  - @prosopo/locale@3.2.5
  - @prosopo/api@3.5.2
  - @prosopo/common@3.1.40
  - @prosopo/procaptcha-common@2.10.26

## 2.10.16
### Patch Changes

- 46fedf4: Auto-start image/puzzle widget after PoW escalation so the user does not need to click the checkbox a second time.
- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1
  - @prosopo/api@3.5.1
  - @prosopo/procaptcha-common@2.10.25

## 2.10.15
### Patch Changes

- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0
  - @prosopo/api@3.5.0
  - @prosopo/procaptcha-common@2.10.24

## 2.10.14
### Patch Changes

- Updated dependencies [4626340]
  - @prosopo/types@4.6.1
  - @prosopo/api@3.4.14
  - @prosopo/procaptcha-common@2.10.23

## 2.10.13
### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/util@3.3.0
  - @prosopo/types@4.6.0
  - @prosopo/api@3.4.13
  - @prosopo/common@3.1.39
  - @prosopo/procaptcha-common@2.10.22

## 2.10.12
### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0
  - @prosopo/api@3.4.12
  - @prosopo/procaptcha-common@2.10.21

## 2.10.11
### Patch Changes

- 3973078: Track every lifecycle timestamp on every captcha type, and switch the dapp-verify recency check from issuance→verify to **submit→verify** with the window sourced from per-client settings.
  
  ### Lifecycle timestamps
  
  `StoredCaptcha` (the base shared by PoW, Puzzle, and Image/UserCommitment) gains three new fields:
  
  - `submittedAtTimestamp` — set once on the first user-submission write, never overwritten.
  - `verifiedAtTimestamp` — set once when the dapp first calls /verify, never overwritten.
  - `failedAtTimestamp` — set once on the first non-approved terminal state, never overwritten.
  
  `lastUpdatedTimestamp` keeps its "last write of any kind" meaning. The new fields use `$ifNull` in aggregation-pipeline updates so the stamp lands only on the first transition — concurrent or repeat writes are no-ops on the lifecycle stamps.
  
  ### Submit→verify window
  
  The dapp-verify recency check used to be `now - challengeTimestamp <= timeout`. The window was issuance→verify, which gave bots room to stockpile pre-solved solutions and redeem them many seconds (sometimes minutes) later from the time they reached the provider.
  
  The check is now `now - challengeRecord.submittedAtTimestamp <= clientSettings.verifiedTimeout`. The window measures from the moment the user's solution actually arrived. Combined with the new lifecycle fields, this tightens the stockpile attack surface.
  
  ### Settings move
  
  `verifiedTimeout` moves to `ClientSettingsSchema` (per-client, operator-set via the portal). Default stays at 120000ms for back-compat; auto-submit dapps should set it to ~10000ms.
  
  Removed from request bodies entirely:
  
  - `ServerPowCaptchaVerifyRequestBody`
  - `ServerPuzzleCaptchaVerifyRequestBody`
  - `SubmitPowCaptchaSolutionBody`
  - `SubmitPuzzleCaptchaSolutionBody`
  
  The client field was client-controlled and unsigned — any caller could raise the recency ceiling. It's now server-determined.
  
  `ProviderApiInterface.submitPow/PuzzleCaptchaSolution` lose their `timeout` parameter (no longer forwarded). The verify wrappers keep their `recencyLimit` parameter for caller back-compat but the value is no longer transmitted; server reads from the client settings instead.
  
  ### Migration
  
  Pre-PR records with `userSubmitted=true` but no `submittedAtTimestamp` will fail the new recency check. The submit window is short (120s default verifiedTimeout) so the migration cliff is naturally bounded — records in flight at deploy time expire within ~2 minutes.
  
  348 provider unit tests + 28 database tests pass.
- Updated dependencies [f69724f]
- Updated dependencies [3973078]
  - @prosopo/types@4.4.1
  - @prosopo/api@3.4.11
  - @prosopo/procaptcha-common@2.10.20

## 2.10.10
### Patch Changes

- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types@4.4.0
  - @prosopo/api@3.4.10
  - @prosopo/procaptcha-common@2.10.19

## 2.10.9
### Patch Changes

- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/api@3.4.9
  - @prosopo/procaptcha-common@2.10.18

## 2.10.8
### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [6ca1125]
  - @prosopo/types@4.3.0
  - @prosopo/util@3.2.15
  - @prosopo/api@3.4.8
  - @prosopo/common@3.1.38
  - @prosopo/procaptcha-common@2.10.17

## 2.10.7
### Patch Changes

- d3db08d: feat(widget): bait AI responses with empty input + decoded label, portaled into the dapp's form
  
  Redesigns the honeypot so it can actually catch AI agents instead of being inert:
  
  - Empty input + decoded label: the encoded morse/semaphore question moves from `input.value` to an offscreen `<label>` (base64-decoded at render). Naive form-fillers and humans leave the empty input alone; agents that read the DOM as a prompt write into the empty field, captured as `clientMetaData.hp` on submit.
  - Portaled to light DOM, inside the dapp's `<form>`: widget stays in shadow DOM, but the honeypot portals via `react-dom/createPortal` into the enclosing form (`document.body` fallback). Bots no longer have to traverse `.shadowRoot` to reach it (which was tripping `@prosopo/catcher`'s shadow-DOM guard and wiping the bot's value), and the bait sits where bots actually look — `form.querySelectorAll('input')`.
  - `form="<useId>-d"`: opaque per-instance non-existent form id disassociates the input from native form submission while keeping it DOM-discoverable. Dapp backends don't receive a stray `email_confirm=` field.
  - Shared `<Honeypot />` extracted to `@prosopo/procaptcha-common`.
  - `procaptcha-bundle` Vite config now routes the Honeypot module into a per-build opaque chunk (`c<random8hex>-<hash>.js`) so the URL doesn't identify the component or stay stable across builds for static blocklisting.
- Updated dependencies [d3db08d]
  - @prosopo/procaptcha-common@2.10.16

## 2.10.6
### Patch Changes

- 6c26669: Add per-site honeypot trap. When enabled, the provider attaches an encoded question (morse or semaphore, base64-wrapped) in the `x-prosopo-meta` response header on frictionless responses. The widget renders the value into an off-screen hidden input with `name="email_confirm"`; bots that auto-fill text inputs populate it and the value rides back on the solution submit as `clientMetaData.hp`, which is persisted on the `StoredCaptcha` record. Falls back to a random phrase from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH` when no custom question is configured.
- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/api@3.4.7
  - @prosopo/procaptcha-common@2.10.15

## 2.10.5
### Patch Changes

- Updated dependencies [0fd81af]
  - @prosopo/common@3.1.37
  - @prosopo/procaptcha-common@2.10.14

## 2.10.4
### Patch Changes

- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0
  - @prosopo/api@3.4.6
  - @prosopo/procaptcha-common@2.10.13

## 2.10.3
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4
  - @prosopo/api@3.4.5
  - @prosopo/procaptcha-common@2.10.12

## 2.10.2
### Patch Changes

- Updated dependencies [6567ce0]
- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/util@3.2.14
  - @prosopo/types@4.1.3
  - @prosopo/locale@3.2.4
  - @prosopo/api@3.4.4
  - @prosopo/common@3.1.36
  - @prosopo/procaptcha-common@2.10.11

## 2.10.1
### Patch Changes

- Updated dependencies [72a1218]
- Updated dependencies [566c1f6]
  - @prosopo/util@3.2.13
  - @prosopo/widget-skeleton@2.8.3
  - @prosopo/types@4.1.2
  - @prosopo/procaptcha-common@2.10.10
  - @prosopo/api@3.4.3

## 2.10.0
### Minor Changes

- 91958da: Puzzle captcha + maintenance mode hardening, plus a refactor of the
  frictionless handler into focused modules.
  
  - **Puzzle captcha now records checkbox-click coordinates like POW.** Adds an
    optional `salt` field to `SubmitPuzzleCaptchaSolutionBody`; the puzzle
    widget hashes the click coords into the salt and the server decodes them
    into the puzzle record's `coords` field on submit. New `start(x, y)`
    parameters on `procaptcha-puzzle` Manager + widget.
  - **Fix puzzle "No session found" caused by stale Redis dedup.** The
    `/frictionless` dedup path is now Mongo-authoritative — Redis is no
    longer consulted as a session source. A concurrent `/captcha/{type}`
    invalidation could previously race a fire-and-forget Redis repopulation
    in the `/frictionless` dedup branch, leaving Redis pointing at a
    Mongo-deleted session for the full 1-hour TTL. Stale pointers are now
    evicted lazily.
  - **Maintenance mode operates without MongoDB.** `/frictionless` and
    `/captcha/{pow,puzzle}` short-circuit to dummy responses before any DB
    call, and `Environment.isReady()` tolerates a Mongo connect failure when
    `MAINTENANCE_MODE=true` so the provider can start with Mongo down.
  - **Refactor `getFrictionlessCaptchaChallenge.ts` into focused modules** under
    `getFrictionlessCaptchaChallenge/` (handler, sessionDedup, shortCircuit,
    accessPolicy, decisionMachine, decryptSimdReadings, constants). Original
    import path preserved via a re-export shim.
  - **Move `RedisWriteQueue` from `@prosopo/provider` to `@prosopo/database`**
    (where the Redis connection itself lives), and clear residual Redis
    session keys at provider startup via `Environment.cleanup()` so a
    previously-crashed run can't leak stale dedup pointers.
  - Adds puzzle-type branch to access-policy handling in `/frictionless`.

### Patch Changes

- Updated dependencies [53bfd45]
- Updated dependencies [91958da]
  - @prosopo/procaptcha-common@2.10.9
  - @prosopo/locale@3.2.3
  - @prosopo/api@3.4.2
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35

## 2.9.2
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/api@3.4.1
  - @prosopo/procaptcha-common@2.10.8

## 2.9.1
### Patch Changes

  - @prosopo/procaptcha-common@2.10.7

## 2.9.0
### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.
- 273926d: Fix `/captcha/{type}` endpoints looping with "No session found" when the
  Redis session cache and Mongo diverge: on a session lookup miss the cache
  entry is now invalidated, so the next `/frictionless` falls through and
  creates a fresh session instead of resurrecting the dead one.
  
  Add invisible-mode support to the puzzle captcha widget: the
  execute-event handler now drives the full phase transition
  (`start` → `setChallengeData` → `dragging`), and the puzzle overlay is
  rendered in invisible mode so the user can still solve the (inherently
  interactive) drag challenge — only the checkbox UI is hidden.
  
  Add `invisible-puzzle-implicit.html` / `invisible-puzzle-explicit.html`
  demo pages, and surface both standard and invisible puzzle entries in
  the client-bundle-example navbar.

### Patch Changes

- 4aae4e6: Plumb the WASM SIMD CPU fingerprint readings (collected by the catcher
  client per https://blog.azerpas.com/writing/wasm-simd-fingerprinting/)
  through the captcha flow and onto the linked `Session` record.
  Collection-only — no scoring or classification yet.
  
  The readings are sent at the earliest moment they're available so the
  signal lands on the session as soon as possible:
  
  1. **Captcha-challenge GET** (PoW / Puzzle / Image) — the procaptcha
     Manager calls `frictionlessState.getSimdReadings(0)` (non-blocking
     cache check) and attaches it to the challenge-request body. The
     provider handler decodes and patches the linked session via
     `updateSessionRecord`.
  2. **Solution submission** (PoW / Puzzle / Image) — same non-blocking
     check on the submit body. Acts as a backup if the benchmark wasn't
     ready in time for the challenge GET.
  
  Frictionless init itself stays SIMD-free (benchmark is too slow to gate
  the first hop).
  
  Surface area:
  
  - `SimdReadings` discriminated union + `SimdOpReadingRecord` /
    `SimdOpCategory` in `@prosopo/types`, plus `simdReadingsCodec` shared
    encode/decode helpers so the browser SDK and the provider use the same
    pipe-safe wire format.
  - Optional `simdReadings: string()` on `CaptchaRequestBody`,
    `GetPowCaptchaChallengeRequestBody`, `GetPuzzleCaptchaChallengeRequestBody`,
    `CaptchaSolutionBody`, `SubmitPowCaptchaSolutionBody`, and
    `SubmitPuzzleCaptchaSolutionBody`.
  - `FrictionlessState.getSimdReadings` + `BotDetectionFunctionResult.getSimdReadings`
    so the catcher's prefetched benchmark is consumed at the request sites.
  - `ProcaptchaApiInterface.{getCaptchaChallenge, submitCaptchaSolution}` and
    the `ProviderApi.{getCaptchaChallenge, getPowCaptchaChallenge, getPuzzleCaptchaChallenge,
    submitCaptchaSolution, submitPowCaptchaSolution, submitPuzzleCaptchaSolution}`
    client methods accept the field.
  - Provider challenge + solution handlers decode via `decodeSimdReadings`
    and `updateSessionRecord` (Mongoose `Mixed`, Zod discriminated-union
    validation at the edge). The challenge-GET patch is fire-and-forget.
  
  Backward-compatible: older catcher clients omit the field at every layer;
  the session record omits it in turn.
- Updated dependencies [3c0be68]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [d865319]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4993813]
- Updated dependencies [5f1ae53]
  - @prosopo/types@4.0.0
  - @prosopo/api@3.4.0
  - @prosopo/locale@3.2.2
  - @prosopo/util@3.2.12
  - @prosopo/common@3.1.34
  - @prosopo/widget-skeleton@2.8.2
  - @prosopo/procaptcha-common@2.10.6
