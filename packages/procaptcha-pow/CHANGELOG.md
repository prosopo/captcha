# @prosopo/procaptcha-pow

## 2.10.17
### Patch Changes

  - @prosopo/procaptcha-common@2.11.11

## 2.10.16
### Patch Changes

  - @prosopo/common@3.1.45
  - @prosopo/procaptcha-common@2.11.10

## 2.10.15
### Patch Changes

- Updated dependencies [85e8857]
  - @prosopo/api@3.5.15
  - @prosopo/types@4.9.8
  - @prosopo/util@3.3.4
  - @prosopo/common@3.1.44
  - @prosopo/fingerprint@2.7.14
  - @prosopo/procaptcha-common@2.11.9

## 2.10.14
### Patch Changes

- Updated dependencies [8bde5df]
  - @prosopo/types@4.9.7
  - @prosopo/api@3.5.14
  - @prosopo/fingerprint@2.7.13
  - @prosopo/procaptcha-common@2.11.8

## 2.10.13
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
  - @prosopo/fingerprint@2.7.12

## 2.10.12
### Patch Changes

- Updated dependencies [6cb3218]
  - @prosopo/types@4.9.5
  - @prosopo/api@3.5.12
  - @prosopo/fingerprint@2.7.11
  - @prosopo/procaptcha-common@2.11.6

## 2.10.11
### Patch Changes

- Updated dependencies [de12b31]
- Updated dependencies [770954b]
  - @prosopo/types@4.9.4
  - @prosopo/api@3.5.11
  - @prosopo/fingerprint@2.7.10
  - @prosopo/procaptcha-common@2.11.5

## 2.10.10
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
  - @prosopo/fingerprint@2.7.9
  - @prosopo/procaptcha-common@2.11.4

## 2.10.9
### Patch Changes

- Updated dependencies [8814425]
  - @prosopo/api@3.5.9

## 2.10.8
### Patch Changes

- 0983c51: fix(procaptcha-pow): forward all props through the Suspense wrapper so `onEscalate` and `autoStart` reach the inner widget. The PoW (and puzzle) wrappers were enumerating props by name and silently dropping `onEscalate`, which meant the Manager closure captured `onEscalate=undefined`. When the provider returned a post-PoW escalation envelope, `onEscalate?.()` no-op'd, the frictionless wrapper was never told to swap in the image widget, and the user was left with a spinning PoW checkbox forever. Both wrappers now spread props, matching the image (`Procaptcha`) sibling.
- Updated dependencies [f9e8c94]
- Updated dependencies [7a434e0]
  - @prosopo/locale@3.2.6
  - @prosopo/types@4.9.2
  - @prosopo/common@3.1.43
  - @prosopo/api@3.5.8
  - @prosopo/fingerprint@2.7.8
  - @prosopo/procaptcha-common@2.11.3

## 2.10.7
### Patch Changes

- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/types@4.9.1
  - @prosopo/util@3.3.3
  - @prosopo/api@3.5.7
  - @prosopo/common@3.1.42
  - @prosopo/fingerprint@2.7.7
  - @prosopo/procaptcha-common@2.11.2

## 2.10.6
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
  - @prosopo/fingerprint@2.7.6
  - @prosopo/procaptcha-common@2.11.1

## 2.10.5
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
  - @prosopo/fingerprint@2.7.5

## 2.10.4
### Patch Changes

- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4
  - @prosopo/api@3.5.4
  - @prosopo/fingerprint@2.7.4
  - @prosopo/procaptcha-common@2.10.28

## 2.10.3
### Patch Changes

- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/api@3.5.3
  - @prosopo/fingerprint@2.7.3
  - @prosopo/procaptcha-common@2.10.27

## 2.10.2
### Patch Changes

- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/util@3.3.1
  - @prosopo/types@4.7.2
  - @prosopo/locale@3.2.5
  - @prosopo/api@3.5.2
  - @prosopo/common@3.1.40
  - @prosopo/fingerprint@2.7.2
  - @prosopo/procaptcha-common@2.10.26

## 2.10.1
### Patch Changes

- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1
  - @prosopo/api@3.5.1
  - @prosopo/fingerprint@2.7.1
  - @prosopo/procaptcha-common@2.10.25

## 2.10.0
### Minor Changes

- dde23e8: Internal bot-detection signal improvements.

### Patch Changes

- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0
  - @prosopo/fingerprint@2.7.0
  - @prosopo/api@3.5.0
  - @prosopo/procaptcha-common@2.10.24

## 2.9.10
### Patch Changes

- Updated dependencies [4626340]
  - @prosopo/types@4.6.1
  - @prosopo/api@3.4.14
  - @prosopo/procaptcha-common@2.10.23

## 2.9.9
### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/util@3.3.0
  - @prosopo/types@4.6.0
  - @prosopo/api@3.4.13
  - @prosopo/common@3.1.39
  - @prosopo/procaptcha-common@2.10.22

## 2.9.8
### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0
  - @prosopo/api@3.4.12
  - @prosopo/procaptcha-common@2.10.21

## 2.9.7
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

## 2.9.6
### Patch Changes

- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types@4.4.0
  - @prosopo/api@3.4.10
  - @prosopo/procaptcha-common@2.10.19

## 2.9.5
### Patch Changes

- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/api@3.4.9
  - @prosopo/procaptcha-common@2.10.18

## 2.9.4
### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [6ca1125]
  - @prosopo/types@4.3.0
  - @prosopo/util@3.2.15
  - @prosopo/api@3.4.8
  - @prosopo/common@3.1.38
  - @prosopo/procaptcha-common@2.10.17

## 2.9.3
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

## 2.9.2
### Patch Changes

- 6c26669: Add per-site honeypot trap. When enabled, the provider attaches an encoded question (morse or semaphore, base64-wrapped) in the `x-prosopo-meta` response header on frictionless responses. The widget renders the value into an off-screen hidden input with `name="email_confirm"`; bots that auto-fill text inputs populate it and the value rides back on the solution submit as `clientMetaData.hp`, which is persisted on the `StoredCaptcha` record. Falls back to a random phrase from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH` when no custom question is configured.
- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/api@3.4.7
  - @prosopo/procaptcha-common@2.10.15

## 2.9.1
### Patch Changes

- Updated dependencies [0fd81af]
  - @prosopo/common@3.1.37
  - @prosopo/procaptcha-common@2.10.14

## 2.9.0
### Minor Changes

- 20cae63: feat(provider): re-route after PoW using decrypted behavioural data
  
  PoW solutions are now re-evaluated by the routing machine after submission.
  Previously the routing decision was made up-front on a thin set of signals;
  behavioural data only becomes available (decrypted server-side) once the
  user submits their PoW solution, so a user with weak behavioural signals
  could still earn a token by solving PoW alone.
  
  The submit endpoint now runs the routing machine a second time in a new
  `postPow` phase, feeding in the decrypted behavioural data, the originating
  session's score, request headers, JA4, and IP info. If the router escalates,
  the provider mints a fresh session (carrying the original session's risk
  profile) and returns `escalation: { captchaType, sessionId }` on the
  `PowCaptchaSolutionResponse`. The `verified` flag is forced to `false` on
  escalation — the user isn't done until they clear the follow-up.
  
  On the client, `ProcaptchaFrictionless` accepts the escalation via a new
  internal `onEscalate` prop on the PoW widget and mounts the chosen image
  or puzzle widget in place, splicing the new sessionId into the
  `FrictionlessState`. The handoff is internal to the frictionless → pow
  flow — dapps integrating Procaptcha see no API change.
  
  `RoutingMachineInputBase.phase` widens from `"route"` to
  `"route" | "postPow"` so decision-machine configs can distinguish the two
  passes.

### Patch Changes

- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0
  - @prosopo/api@3.4.6
  - @prosopo/procaptcha-common@2.10.13

## 2.8.62
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4
  - @prosopo/api@3.4.5
  - @prosopo/procaptcha-common@2.10.12

## 2.8.61
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

## 2.8.60
### Patch Changes

- Updated dependencies [72a1218]
- Updated dependencies [566c1f6]
  - @prosopo/util@3.2.13
  - @prosopo/widget-skeleton@2.8.3
  - @prosopo/types@4.1.2
  - @prosopo/procaptcha-common@2.10.10
  - @prosopo/api@3.4.3

## 2.8.59
### Patch Changes

- Updated dependencies [53bfd45]
- Updated dependencies [91958da]
  - @prosopo/procaptcha-common@2.10.9
  - @prosopo/locale@3.2.3
  - @prosopo/api@3.4.2
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35

## 2.8.58
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/api@3.4.1
  - @prosopo/procaptcha-common@2.10.8

## 2.8.57
### Patch Changes

  - @prosopo/procaptcha-common@2.10.7

## 2.8.56
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

## 2.8.55
### Patch Changes

- Updated dependencies [819ed95]
  - @prosopo/types@3.16.1
  - @prosopo/api@3.3.2
  - @prosopo/procaptcha-common@2.10.5

## 2.8.54
### Patch Changes

- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types@3.16.0
  - @prosopo/api@3.3.1
  - @prosopo/procaptcha-common@2.10.4

## 2.8.53
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0
  - @prosopo/api@3.3.0
  - @prosopo/procaptcha-common@2.10.3

## 2.8.52
### Patch Changes

- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
- Updated dependencies [b94890c]
  - @prosopo/types@3.14.1
  - @prosopo/locale@3.2.1
  - @prosopo/api@3.2.11
  - @prosopo/common@3.1.33
  - @prosopo/procaptcha-common@2.10.2

## 2.8.51
### Patch Changes

- Updated dependencies [06970d2]
- Updated dependencies [fc514dd]
- Updated dependencies [7be39c4]
- Updated dependencies [42650db]
- Updated dependencies [dd3e06e]
  - @prosopo/procaptcha-common@2.10.1
  - @prosopo/widget-skeleton@2.8.1
  - @prosopo/locale@3.2.0
  - @prosopo/types@3.14.0
  - @prosopo/api@3.2.10
  - @prosopo/common@3.1.32

## 2.8.50
### Patch Changes

- Updated dependencies [73df23c]
- Updated dependencies [8139819]
- Updated dependencies [4a9c518]
  - @prosopo/procaptcha-common@2.10.0
  - @prosopo/widget-skeleton@2.8.0
  - @prosopo/common@3.1.31

## 2.8.49
### Patch Changes

- Updated dependencies [a25dffa]
  - @prosopo/util@3.2.11
  - @prosopo/types@3.13.3
  - @prosopo/procaptcha-common@2.9.41
  - @prosopo/api@3.2.9

## 2.8.48
### Patch Changes

- Updated dependencies [346edd7]
  - @prosopo/util@3.2.10
  - @prosopo/types@3.13.2
  - @prosopo/procaptcha-common@2.9.40
  - @prosopo/api@3.2.8

## 2.8.47
### Patch Changes

- Updated dependencies [22bfee7]
- Updated dependencies [20192d2]
  - @prosopo/util@3.2.9
  - @prosopo/widget-skeleton@2.7.14
  - @prosopo/types@3.13.1
  - @prosopo/procaptcha-common@2.9.39
  - @prosopo/api@3.2.7

## 2.8.46
### Patch Changes

- Updated dependencies [e0fb3d6]
- Updated dependencies [e6d9553]
- Updated dependencies [f3f23e3]
  - @prosopo/util@3.2.8
  - @prosopo/types@3.13.0
  - @prosopo/api@3.2.6
  - @prosopo/procaptcha-common@2.9.38

## 2.8.45
### Patch Changes

- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/types@3.12.3
  - @prosopo/util@3.2.7
  - @prosopo/procaptcha-common@2.9.37
  - @prosopo/api@3.2.5

## 2.8.44
### Patch Changes

- Updated dependencies [adb89a6]
  - @prosopo/locale@3.1.29
  - @prosopo/types@3.12.2
  - @prosopo/util@3.2.6
  - @prosopo/api@3.2.4
  - @prosopo/common@3.1.30
  - @prosopo/procaptcha-common@2.9.36

## 2.8.43
### Patch Changes

- Updated dependencies [c5ee492]
- Updated dependencies [a90eb54]
  - @prosopo/common@3.1.29
  - @prosopo/types@3.12.1
  - @prosopo/api@3.2.3
  - @prosopo/procaptcha-common@2.9.35

## 2.8.42
### Patch Changes

- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/types@3.12.0
  - @prosopo/procaptcha-common@2.9.34
  - @prosopo/api@3.2.2

## 2.8.41
### Patch Changes

- Updated dependencies [8148587]
  - @prosopo/types@3.11.1
  - @prosopo/api@3.2.1
  - @prosopo/procaptcha-common@2.9.33

## 2.8.40
### Patch Changes

- Updated dependencies [7f6ffc5]
  - @prosopo/types@3.11.0
  - @prosopo/api@3.2.0
  - @prosopo/procaptcha-common@2.9.32

## 2.8.39
### Patch Changes

- Updated dependencies [93fa086]
  - @prosopo/types@3.10.2
  - @prosopo/api@3.1.49
  - @prosopo/procaptcha-common@2.9.31

## 2.8.38
### Patch Changes

- Updated dependencies [cde7550]
  - @prosopo/types@3.10.1
  - @prosopo/api@3.1.48
  - @prosopo/procaptcha-common@2.9.30

## 2.8.37
### Patch Changes

- Updated dependencies [ad6d622]
  - @prosopo/types@3.10.0
  - @prosopo/api@3.1.47
  - @prosopo/procaptcha-common@2.9.29

## 2.8.36
### Patch Changes

- 592adf1: Don't make people wait so long for a new session
- Updated dependencies [ff58a70]
  - @prosopo/types@3.9.0
  - @prosopo/api@3.1.46
  - @prosopo/procaptcha-common@2.9.28

## 2.8.35
### Patch Changes

- Updated dependencies [d2431cd]
  - @prosopo/types@3.8.4
  - @prosopo/api@3.1.45
  - @prosopo/procaptcha-common@2.9.27

## 2.8.34
### Patch Changes

- Updated dependencies [bd6995b]
  - @prosopo/types@3.8.3
  - @prosopo/api@3.1.44
  - @prosopo/procaptcha-common@2.9.26

## 2.8.33
### Patch Changes

- Updated dependencies [9633e58]
  - @prosopo/types@3.8.2
  - @prosopo/api@3.1.43
  - @prosopo/procaptcha-common@2.9.25

## 2.8.32
### Patch Changes

- Updated dependencies [f52a5c1]
  - @prosopo/types@3.8.1
  - @prosopo/api@3.1.42
  - @prosopo/procaptcha-common@2.9.24

## 2.8.31
### Patch Changes

- a53526b: enhance/pow-client-solution
- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- 3acc333: Release 3.3.0
- Updated dependencies [a53526b]
- Updated dependencies [f3cf586]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [7543d17]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/util@3.2.5
  - @prosopo/procaptcha-common@2.9.23
  - @prosopo/util-crypto@13.5.29
  - @prosopo/types@3.8.0
  - @prosopo/widget-skeleton@2.7.13
  - @prosopo/common@3.1.28
  - @prosopo/locale@3.1.28
  - @prosopo/api@3.1.41

## 2.8.30
### Patch Changes

- 141e462: Capture correct event
- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/api@3.1.40
  - @prosopo/procaptcha-common@2.9.22

## 2.8.29
### Patch Changes

- 345b25b: pow coord
- Updated dependencies [345b25b]
  - @prosopo/types@3.7.1
  - @prosopo/api@3.1.39
  - @prosopo/procaptcha-common@2.9.21

## 2.8.28
### Patch Changes

- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
- Updated dependencies [e01227b]
  - @prosopo/types@3.7.0
  - @prosopo/locale@3.1.27
  - @prosopo/api@3.1.38
  - @prosopo/common@3.1.27
  - @prosopo/procaptcha-common@2.9.20

## 2.8.27
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/api@3.1.37
  - @prosopo/common@3.1.26
  - @prosopo/locale@3.1.26
  - @prosopo/procaptcha-common@2.9.19
  - @prosopo/types@3.6.4
  - @prosopo/util@3.2.4
  - @prosopo/widget-skeleton@2.7.12

## 2.8.26
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/api@3.1.36
  - @prosopo/common@3.1.25
  - @prosopo/locale@3.1.25
  - @prosopo/procaptcha-common@2.9.18
  - @prosopo/types@3.6.3
  - @prosopo/util@3.2.3
  - @prosopo/widget-skeleton@2.7.11

## 2.8.25
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/procaptcha-common@2.9.17
  - @prosopo/widget-skeleton@2.7.10
  - @prosopo/common@3.1.24
  - @prosopo/locale@3.1.24
  - @prosopo/types@3.6.2
  - @prosopo/util@3.2.2
  - @prosopo/api@3.1.35

## 2.8.24
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/api@3.1.34
  - @prosopo/common@3.1.23
  - @prosopo/locale@3.1.23
  - @prosopo/procaptcha-common@2.9.16
  - @prosopo/types@3.6.1
  - @prosopo/util@3.2.1
  - @prosopo/widget-skeleton@2.7.9

## 2.8.23
### Patch Changes

- Updated dependencies [9128d5e]
- Updated dependencies [9128d5e]
  - @prosopo/procaptcha-common@2.9.15

## 2.8.22
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/types@3.6.0
  - @prosopo/util@3.2.0
  - @prosopo/procaptcha-common@2.9.14
  - @prosopo/widget-skeleton@2.7.8
  - @prosopo/common@3.1.22
  - @prosopo/locale@3.1.22
  - @prosopo/api@3.1.33
  - @prosopo/config@3.1.22

## 2.8.21
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/api@3.1.32
  - @prosopo/procaptcha-common@2.9.13

## 2.8.20
### Patch Changes

- Updated dependencies [cb8ab85]
  - @prosopo/types@3.5.10
  - @prosopo/api@3.1.31
  - @prosopo/procaptcha-common@2.9.12

## 2.8.19
### Patch Changes

- Updated dependencies [43907e8]
- Updated dependencies [005ce66]
- Updated dependencies [7101036]
  - @prosopo/types@3.5.9
  - @prosopo/util@3.1.7
  - @prosopo/api@3.1.30
  - @prosopo/procaptcha-common@2.9.11

## 2.8.18
### Patch Changes

- Updated dependencies [e5c259d]
  - @prosopo/types@3.5.8
  - @prosopo/api@3.1.29
  - @prosopo/procaptcha-common@2.9.10

## 2.8.17
### Patch Changes

- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
  - @prosopo/api@3.1.28
  - @prosopo/common@3.1.21
  - @prosopo/config@3.1.21
  - @prosopo/locale@3.1.21
  - @prosopo/procaptcha-common@2.9.9
  - @prosopo/types@3.5.7
  - @prosopo/util@3.1.6
  - @prosopo/widget-skeleton@2.7.7

## 2.8.16
### Patch Changes

- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/api@3.1.27
  - @prosopo/procaptcha-common@2.9.8

## 2.8.15
### Patch Changes

- Updated dependencies [494c5a8]
  - @prosopo/types@3.5.5
  - @prosopo/api@3.1.26
  - @prosopo/procaptcha-common@2.9.7

## 2.8.14
### Patch Changes

- Updated dependencies [08ff50f]
  - @prosopo/types@3.5.4
  - @prosopo/api@3.1.25
  - @prosopo/procaptcha-common@2.9.6

## 2.8.13
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/procaptcha-common@2.9.5
  - @prosopo/api@3.1.24
  - @prosopo/common@3.1.20
  - @prosopo/locale@3.1.20
  - @prosopo/types@3.5.3
  - @prosopo/util@3.1.5
  - @prosopo/widget-skeleton@2.7.6

## 2.8.12
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/procaptcha-common@2.9.4
  - @prosopo/widget-skeleton@2.7.5
  - @prosopo/locale@3.1.19
  - @prosopo/types@3.5.2
  - @prosopo/util@3.1.4
  - @prosopo/api@3.1.23
  - @prosopo/config@3.1.19

## 2.8.11
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/procaptcha-common@2.9.3
  - @prosopo/widget-skeleton@2.7.4
  - @prosopo/common@3.1.18
  - @prosopo/locale@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/api@3.1.22
  - @prosopo/config@3.1.18

## 2.8.10
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/procaptcha-common@2.9.2
  - @prosopo/widget-skeleton@2.7.3
  - @prosopo/common@3.1.17
  - @prosopo/locale@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/util@3.1.2
  - @prosopo/api@3.1.21
  - @prosopo/config@3.1.17

## 2.8.9
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/procaptcha-common@2.9.1
  - @prosopo/widget-skeleton@2.7.2
  - @prosopo/common@3.1.16
  - @prosopo/locale@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/util@3.1.1
  - @prosopo/api@3.1.20
  - @prosopo/config@3.1.16

## 2.8.8
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/procaptcha-common@2.9.0
  - @prosopo/widget-skeleton@2.7.1
  - @prosopo/common@3.1.15
  - @prosopo/locale@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/util@3.1.0
  - @prosopo/api@3.1.19
  - @prosopo/config@3.1.15

## 2.8.7
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/widget-skeleton@2.7.0
  - @prosopo/types@3.3.0
  - @prosopo/procaptcha-common@2.8.7
  - @prosopo/common@3.1.14
  - @prosopo/locale@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/api@3.1.18
  - @prosopo/config@3.1.14

## 2.8.6
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types@3.2.1
  - @prosopo/procaptcha-common@2.8.6
  - @prosopo/widget-skeleton@2.6.14
  - @prosopo/common@3.1.13
  - @prosopo/locale@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/api@3.1.17
  - @prosopo/config@3.1.13

## 2.8.5
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [0824221]
  - @prosopo/types@3.2.0
  - @prosopo/procaptcha-common@2.8.5
  - @prosopo/widget-skeleton@2.6.13
  - @prosopo/common@3.1.12
  - @prosopo/locale@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/api@3.1.16
  - @prosopo/config@3.1.12

## 2.8.4
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/types@3.1.4
  - @prosopo/procaptcha-common@2.8.4
  - @prosopo/widget-skeleton@2.6.12
  - @prosopo/common@3.1.11
  - @prosopo/util@3.0.14
  - @prosopo/api@3.1.15
  - @prosopo/config@3.1.11

## 2.8.3
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [36b23e0]
- Updated dependencies [657a827]
  - @prosopo/api@3.1.14
  - @prosopo/procaptcha-common@2.8.3
  - @prosopo/widget-skeleton@2.6.11
  - @prosopo/common@3.1.10
  - @prosopo/locale@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/util@3.0.13
  - @prosopo/config@3.1.10

## 2.8.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/procaptcha-common@2.8.2
  - @prosopo/widget-skeleton@2.6.10
  - @prosopo/common@3.1.9
  - @prosopo/locale@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/util@3.0.12
  - @prosopo/api@3.1.13
  - @prosopo/config@3.1.9

## 2.8.1
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/types@3.1.1
  - @prosopo/procaptcha-common@2.8.1
  - @prosopo/widget-skeleton@2.6.9
  - @prosopo/common@3.1.8
  - @prosopo/locale@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/api@3.1.12
  - @prosopo/config@3.1.8

## 2.8.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/procaptcha-common@2.8.0
  - @prosopo/widget-skeleton@2.6.8
  - @prosopo/common@3.1.7
  - @prosopo/locale@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/util@3.0.10
  - @prosopo/api@3.1.11
  - @prosopo/config@3.1.7

## 2.7.25
### Patch Changes

- 9eed772: Release 3.1.12
- a07db04: Release 3.1.12
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
- Updated dependencies [ebb0168]
  - @prosopo/config@3.1.6
  - @prosopo/api@3.1.10
  - @prosopo/util@3.0.9
  - @prosopo/common@3.1.6
  - @prosopo/locale@3.1.6
  - @prosopo/procaptcha-common@2.7.18
  - @prosopo/types@3.0.10
  - @prosopo/widget-skeleton@2.6.7

## 2.7.24
### Patch Changes

  - @prosopo/api@3.1.9

## 2.7.23
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/locale@3.1.5
  - @prosopo/procaptcha-common@2.7.17
  - @prosopo/widget-skeleton@2.6.6
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9
  - @prosopo/util@3.0.8
  - @prosopo/api@3.1.8

## 2.7.22
### Patch Changes

- 30e7d4d: Fixing coverage report and more damn linting
- Updated dependencies [30e7d4d]
  - @prosopo/procaptcha-common@2.7.16
  - @prosopo/config@3.1.5
  - @prosopo/procaptcha@2.7.22
  - @prosopo/account@2.7.14
  - @prosopo/api@3.1.7
  - @prosopo/common@3.1.4
  - @prosopo/locale@3.1.4
  - @prosopo/types@3.0.8
  - @prosopo/util@3.0.7
  - @prosopo/widget-skeleton@2.6.5

## 2.7.21
### Patch Changes

- 1f3a02f: Release 3.1.8
- Updated dependencies [1f3a02f]
  - @prosopo/procaptcha-common@2.7.15
  - @prosopo/procaptcha@2.7.21
  - @prosopo/api@3.1.6

## 2.7.20
### Patch Changes

- 926df8a: lint
- Updated dependencies [926df8a]
  - @prosopo/procaptcha-common@2.7.14
  - @prosopo/procaptcha@2.7.20
  - @prosopo/api@3.1.5

## 2.7.19
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/account@2.7.13
  - @prosopo/api@3.1.4
  - @prosopo/locale@3.1.3
  - @prosopo/procaptcha@2.7.19
  - @prosopo/procaptcha-common@2.7.13
  - @prosopo/types@3.0.7
  - @prosopo/util@3.0.6
  - @prosopo/widget-skeleton@2.6.4

## 2.7.18
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
- 91bbe87: configure typecheck before bundle for vue packages
- 91bbe87: make typecheck script always recompile
- 346e092: NODE_ENV default to "development"
- 5d36e05: remove tsc --force
- Updated dependencies [828066d]
- Updated dependencies [df4e030]
- Updated dependencies [91bbe87]
- Updated dependencies [3ef4fd2]
- Updated dependencies [91bbe87]
- Updated dependencies [346e092]
- Updated dependencies [5d36e05]
  - @prosopo/procaptcha-common@2.7.12
  - @prosopo/widget-skeleton@2.6.3
  - @prosopo/procaptcha@2.7.18
  - @prosopo/account@2.7.12
  - @prosopo/common@3.1.2
  - @prosopo/types@3.0.6
  - @prosopo/api@3.1.3
  - @prosopo/config@3.1.3
  - @prosopo/locale@3.1.2
  - @prosopo/util@3.0.5

## 2.7.17
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/procaptcha-common@2.7.11
  - @prosopo/widget-skeleton@2.6.2
  - @prosopo/procaptcha@2.7.17
  - @prosopo/account@2.7.11
  - @prosopo/common@3.1.1
  - @prosopo/locale@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/util@3.0.4
  - @prosopo/api@3.1.2
  - @prosopo/config@3.1.2

## 2.7.16
### Patch Changes

  - @prosopo/procaptcha@2.7.16

## 2.7.15
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [52dbf21]
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/util@3.0.3
  - @prosopo/widget-skeleton@2.6.1
  - @prosopo/locale@3.1.0
  - @prosopo/types@3.0.4
  - @prosopo/procaptcha-common@2.7.10
  - @prosopo/procaptcha@2.7.15
  - @prosopo/account@2.7.10
  - @prosopo/common@3.1.0
  - @prosopo/api@3.1.1
  - @prosopo/config@3.1.1

## 2.7.14
### Patch Changes

- Updated dependencies [b7c3258]
  - @prosopo/api@3.1.0
  - @prosopo/procaptcha@2.7.14

## 2.7.13
### Patch Changes

  - @prosopo/api@3.0.8
  - @prosopo/procaptcha@2.7.13

## 2.7.12
### Patch Changes

  - @prosopo/api@3.0.7
  - @prosopo/procaptcha@2.7.12

## 2.7.11
### Patch Changes

- Updated dependencies [b0d7207]
  - @prosopo/types@3.0.3
  - @prosopo/api@3.0.6
  - @prosopo/account@2.7.9
  - @prosopo/procaptcha@2.7.11
  - @prosopo/procaptcha-common@2.7.9

## 2.7.10
### Patch Changes

  - @prosopo/account@2.7.8
  - @prosopo/api@3.0.5
  - @prosopo/procaptcha@2.7.10
  - @prosopo/procaptcha-common@2.7.8
  - @prosopo/util@3.0.2

## 2.7.9
### Patch Changes

  - @prosopo/account@2.7.7
  - @prosopo/api@3.0.4
  - @prosopo/procaptcha@2.7.9
  - @prosopo/procaptcha-common@2.7.7
  - @prosopo/util@3.0.1

## 2.7.8
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/locale@3.0.2
  - @prosopo/types@3.0.2
  - @prosopo/common@3.0.2
  - @prosopo/account@2.7.6
  - @prosopo/api@3.0.3
  - @prosopo/procaptcha@2.7.8
  - @prosopo/procaptcha-common@2.7.6

## 2.7.7
### Patch Changes

- Updated dependencies [87bd9bc]
  - @prosopo/locale@3.0.1
  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/account@2.7.5
  - @prosopo/procaptcha@2.7.7
  - @prosopo/procaptcha-common@2.7.5
  - @prosopo/api@3.0.2

## 2.7.6
### Patch Changes

  - @prosopo/api@3.0.1
  - @prosopo/procaptcha@2.7.6

## 2.7.5
### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/locale@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/util@3.0.0
  - @prosopo/api@3.0.0
  - @prosopo/procaptcha@2.7.5
  - @prosopo/account@2.7.4
  - @prosopo/procaptcha-common@2.7.4

## 2.7.4
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0
  - @prosopo/account@2.7.3
  - @prosopo/api@2.7.2
  - @prosopo/procaptcha@2.7.4
  - @prosopo/procaptcha-common@2.7.3

## 2.7.3
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/procaptcha-common@2.7.2
  - @prosopo/procaptcha@2.7.3
  - @prosopo/account@2.7.2
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1
  - @prosopo/api@2.7.1
  - @prosopo/util@2.6.1

## 2.7.2
### Patch Changes

- Updated dependencies [d6de900]
  - @prosopo/api@2.7.0
  - @prosopo/procaptcha@2.7.2

## 2.7.1
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/types@2.9.0
  - @prosopo/account@2.7.1
  - @prosopo/common@2.7.1
  - @prosopo/procaptcha@2.7.1
  - @prosopo/api@2.6.6
  - @prosopo/procaptcha-common@2.7.1

## 2.7.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/procaptcha-common@2.7.0
  - @prosopo/procaptcha@2.7.0
  - @prosopo/account@2.7.0
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/api@2.6.5

## 2.6.13
### Patch Changes

- cf26d7e: Prevents the translation key (WIDGET.I_AM_HUMAN) to be shown until the translation is loaded

## 2.6.12

### Patch Changes

- ea38a1c: lint
- Updated dependencies [ea38a1c]
  - @prosopo/procaptcha-common@2.6.11
  - @prosopo/procaptcha@2.6.12

## 2.6.11

### Patch Changes

- b2ae723: lint
- Updated dependencies [b2ae723]
  - @prosopo/procaptcha-common@2.6.10
  - @prosopo/procaptcha@2.6.11

## 2.6.10

### Patch Changes

- d17c67f: lint
- Updated dependencies [d17c67f]
  - @prosopo/procaptcha-common@2.6.9
  - @prosopo/procaptcha@2.6.10

## 2.6.9

### Patch Changes

- 0d194f2: lint
- Updated dependencies [0d194f2]
  - @prosopo/procaptcha-common@2.6.8
  - @prosopo/procaptcha@2.6.9

## 2.6.8

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/account@2.6.4
  - @prosopo/procaptcha@2.6.8
  - @prosopo/procaptcha-common@2.6.7
  - @prosopo/types@2.7.1
  - @prosopo/api@2.6.4

## 2.6.7

### Patch Changes

- bc892fa: lint
- Updated dependencies [bc892fa]
  - @prosopo/procaptcha-common@2.6.6
  - @prosopo/procaptcha@2.6.7

## 2.6.6

### Patch Changes

- 84fc39f: lint
- Updated dependencies [84fc39f]
  - @prosopo/procaptcha-common@2.6.5
  - @prosopo/procaptcha@2.6.6

## 2.6.5

### Patch Changes

- 5656b0c: Adding cypress tests for invisible
- 5656b0c: Adding all client examples to bundle example
- Updated dependencies [5656b0c]
- Updated dependencies [5656b0c]
  - @prosopo/procaptcha-common@2.6.4
  - @prosopo/procaptcha@2.6.5

## 2.6.4

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0
  - @prosopo/account@2.6.3
  - @prosopo/api@2.6.3
  - @prosopo/procaptcha@2.6.4
  - @prosopo/procaptcha-common@2.6.3

## 2.6.3

### Patch Changes

- @prosopo/procaptcha@2.6.3

## 2.6.2

### Patch Changes

- 6ff193a: Change settings type
- Updated dependencies [6ff193a]
  - @prosopo/procaptcha-common@2.6.2
  - @prosopo/types@2.6.2
  - @prosopo/procaptcha@2.6.2
  - @prosopo/account@2.6.2
  - @prosopo/api@2.6.2

## 2.6.1

### Patch Changes

- Updated dependencies [52feffc]
  - @prosopo/types@2.6.1
  - @prosopo/procaptcha@2.6.1
  - @prosopo/account@2.6.1
  - @prosopo/api@2.6.1
  - @prosopo/procaptcha-common@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/account@2.6.0
  - @prosopo/api@2.6.0
  - @prosopo/common@2.6.0
  - @prosopo/locale@2.6.0
  - @prosopo/procaptcha@2.6.0
  - @prosopo/procaptcha-common@2.6.0
  - @prosopo/types@2.6.0
  - @prosopo/util@2.6.0
  - @prosopo/widget-skeleton@2.6.0
