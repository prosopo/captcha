# @prosopo/procaptcha-frictionless

## 2.12.15
### Patch Changes

- d0f3a52: perf(frictionless): fire provider-pin `/healthz` in parallel with `detect()` instead of serial after
  
  `customDetectBot` was resolving the provider pin (`getProcaptchaRandomActiveProvider`, which hits `/healthz` on the load-balancer DNS endpoint) only after `detect()` returned — so the healthz round-trip was fully serial with the detector suite's ~seconds of worker + fingerprint work. On the network waterfall this showed up as `index-*.js → blob → blob → healthz → frictionless`, with `healthz` blocking the `frictionless` POST from firing.
  
  Fire the pin resolution fire-and-forget at the very top of `customDetectBot`, before the `ExtensionLoader` / `DetectorLoader` dynamic imports even start. `getProcaptchaRandomActiveProvider` is memoised via `pinPromiseCache` keyed on `(env, ipMode)`, so:
  
  - catcher's internal `randomProviderSelectorFn` (called during `detect()`) hits the in-flight promise instead of firing its own healthz
  - the awaited `getProcaptchaRandomActiveProvider(...)` after `detect()` reuses the resolved promise
  
  Both cache keys are prewarmed — one for catcher's selector (no `ipMode`) and one matching the dapp's `data-ipv4`/`data-ipv6` if set. Same-key when the dapp is dual-stack (the common case), which is one healthz request total instead of two.
  
  Net effect: the healthz round-trip (~100–200 ms on cold DNS/TLS) now overlaps with detector work instead of following it. The `frictionless` POST becomes the next hop on the wire immediately after the workers post their scores back.

## 2.12.14
### Patch Changes

  - @prosopo/procaptcha-common@2.11.12
  - @prosopo/procaptcha-pow@2.10.18
  - @prosopo/procaptcha-puzzle@2.10.33
  - @prosopo/procaptcha-react@2.9.91

## 2.12.13
### Patch Changes

- ced80a4: perf(account,procaptcha-frictionless): move sr25519 keypair derivation into CryptoWorker + trim critical-path round-trips
  
  Reduces the frictionless client-side gap (last widget-bundle chunk → `POST /v1/prosopo/provider/client/captcha/frictionless`) by ~1s on constrained hardware (measured at 30x CPU throttle, mean over 5 samples: **3431ms → 2434ms, −997ms / −29%**).
  
  Three changes in one PR because they interact:
  
  1. **sr25519 keypair derivation moves off the main thread.** `ExtensionWeb2.createAccount` was calling `keyring.addFromMnemonic(mnemonic)` synchronously on the main thread. Internally that's `mnemonicToMiniSecret` → `sr25519FromSeed` → a scalar multiplication on Ristretto25519 via `@noble/curves`, dominated by `wNAFCached` / `getPrecomputes` / `multiply`. On a mid-tier laptop that's ~500ms of blocking main-thread work sitting inside the giant `HandlePostMessage → RunMicrotasks` task that also runs the DOM-bound detectors. CryptoWorker now does the derivation and returns the raw `{publicKey, secretKey}` bytes; main thread wraps them with `keyring.addFromPair(...)` which is cheap byte-packaging — no ECC work.
  
  2. **`entropyToMnemonic` + keypair derivation fused into a single worker task (`entropyToKeypair`).** Previously two sequential worker round-trips would have been needed (entropy → mnemonic on worker → return → mnemonic → keypair on worker → return). Fusing saves one postMessage transit (~30-80ms under throttle) on the critical path. The existing `entropyToMnemonic` task stays for callers that still want the mnemonic string standalone.
  
  3. **`CryptoWorkerManager.testWorker()` removed.** It was a Blob-URL-era defensive check — post-construction failures already surface via `worker.onerror` (which cleans up so the next `runTask` reinitialises), and task-level failures surface via `runTask`'s 10s timeout + reject (which triggers the main-thread fallback). Under Vite's `?worker&inline` constructor the round-trip is pure overhead. Removing it saves ~30-80ms per worker init on constrained hardware.
  
  Also: `customDetectBot` starts `ext.getAccount(config)` before calling `detect()` so the CryptoWorker task overlaps with the detector's module.evaluate + botScore work instead of gating them at the end.
  
  Fallback path is preserved end-to-end: worker construction failure or task timeout falls back to synchronous main-thread derivation via `entropyToMnemonic` + `keyring.addFromMnemonic`, matching prior behaviour for browsers that block workers (CSP, embedded WebViews).
  
  Measurement setup: Chrome via CDP, 30x CPU throttling, 5 samples each on identical hardware, gap timed from last js chunk `finish` → `healthz` request start (proxy for “widget can send frictionless POST”). Both sides use the same generation of the catcher-derived detector blob, so the delta reflects only the captcha-side changes.
  - @prosopo/procaptcha-common@2.11.11
  - @prosopo/procaptcha-pow@2.10.17
  - @prosopo/procaptcha-puzzle@2.10.32
  - @prosopo/procaptcha-react@2.9.90

## 2.12.12
### Patch Changes

  - @prosopo/common@3.1.45
  - @prosopo/procaptcha-pow@2.10.16
  - @prosopo/procaptcha-puzzle@2.10.31
  - @prosopo/procaptcha-react@2.9.89
  - @prosopo/procaptcha-common@2.11.10

## 2.12.11
### Patch Changes

- 85e8857: Record both the top-frame URL and the widget's own iframe URL on frictionless sessions.
  
  Previously the client only sent one field (`currentUrl`), which for embedded widgets resolved to the top-frame URL — so we lost visibility into which iframe endpoint the session was actually loaded through. Now the client sends both:
  
  - `currentUrl`: the top-frame URL (same resolution rules as before — same-origin iframes read `window.top.location.href` directly; cross-origin iframes fall back to `document.referrer`).
  - `iframeUrl`: the widget's own frame URL when embedded. Undefined when the widget IS the top frame (nothing to distinguish).
  
  Both fields are sanitised client- and server-side (origin + path only; query string, fragment and any embedded credentials stripped). The provider persists both on the `Session` record and re-uses them on post-PoW escalation sessions. Only `currentUrl` is gated in the frictionless decision machine (unchanged — missing `currentUrl` still forces an image captcha); `iframeUrl` is recorded for analytics.
  
  Both fields are also surfaced to the decision machines as raw signals: `RoutingMachineRawSignals` gains an optional `iframeUrl` populated from the freshly decrypted frictionless payload on the `route` phase, from the persisted Session record on the `postPow` phase, and from the cached Session in the dedup replay path — matching how `currentUrl` is already threaded through.
  
  Additionally, sessions carry a new computed boolean `isProtect`, set at session-creation time when the widget iframe was served from `protect.<tenant>` and embedded in a page on the same tenant (subdomain-of matching, dot-boundary safe — see `isProtectDeployment` in `@prosopo/util`). Persisted only when true (same pattern as `isEscalation`) and backed by a sparse `{isProtect, createdAt}` index so analytics can cheaply retrieve Protect sessions without re-parsing URLs. Post-PoW escalation sessions inherit the flag from the origin session.
- Updated dependencies [85e8857]
  - @prosopo/api@3.5.15
  - @prosopo/types@4.9.8
  - @prosopo/procaptcha-pow@2.10.15
  - @prosopo/procaptcha-puzzle@2.10.30
  - @prosopo/common@3.1.44
  - @prosopo/detector@3.5.9
  - @prosopo/procaptcha-common@2.11.9
  - @prosopo/procaptcha-react@2.9.88

## 2.12.10
### Patch Changes

- Updated dependencies [8bde5df]
  - @prosopo/types@4.9.7
  - @prosopo/api@3.5.14
  - @prosopo/detector@3.5.8
  - @prosopo/procaptcha-common@2.11.8
  - @prosopo/procaptcha-pow@2.10.14
  - @prosopo/procaptcha-puzzle@2.10.29
  - @prosopo/procaptcha-react@2.9.87

## 2.12.9
### Patch Changes

- 35d2784: Report the top-frame URL as `currentUrl` when the widget runs inside an iframe.
  
  Previously the frictionless client always sent `window.location.origin + pathname`, which is the iframe's own URL — so every session loaded through Protect's site-wide iframe (`protect.<tenant>.live/...`) reported the same widget endpoint regardless of which page the user was actually on. Downstream detectors (HEAD_HASH_OUTLIER's proxy-pool signal in particular) then saw diverse-geography traffic on one URL+UA fingerprint and treated our own iframe as a bot cluster.
  
  Resolution order for `currentUrl`:
  1. Top window → local `location.href` (widget is the top frame).
  2. Same-origin iframe → `window.top.location.href`.
  3. Cross-origin iframe → `document.referrer` (browser fills it subject to Referrer-Policy).
  4. Fallback → the iframe's own `location.href` so the field is never empty.
  
  Origin+path sanitisation is preserved across all paths — the query string, fragment and any embedded credentials are still stripped before the URL leaves the browser.

## 2.12.8
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
  - @prosopo/procaptcha-puzzle@2.10.28
  - @prosopo/procaptcha-pow@2.10.13
  - @prosopo/types@4.9.6
  - @prosopo/procaptcha-react@2.9.86
  - @prosopo/api@3.5.13
  - @prosopo/detector@3.5.7

## 2.12.7
### Patch Changes

- Updated dependencies [6cb3218]
  - @prosopo/types@4.9.5
  - @prosopo/api@3.5.12
  - @prosopo/detector@3.5.6
  - @prosopo/procaptcha-common@2.11.6
  - @prosopo/procaptcha-pow@2.10.12
  - @prosopo/procaptcha-puzzle@2.10.27
  - @prosopo/procaptcha-react@2.9.85

## 2.12.6
### Patch Changes

- Updated dependencies [de12b31]
- Updated dependencies [770954b]
  - @prosopo/types@4.9.4
  - @prosopo/api@3.5.11
  - @prosopo/detector@3.5.5
  - @prosopo/procaptcha-common@2.11.5
  - @prosopo/procaptcha-pow@2.10.11
  - @prosopo/procaptcha-puzzle@2.10.26
  - @prosopo/procaptcha-react@2.9.84

## 2.12.5
### Patch Changes

- 18d0287: fix(procaptcha-frictionless,procaptcha-pow,procaptcha-puzzle,procaptcha-react): auto-recover from `CAPTCHA.NO_SESSION_FOUND` on the inner widget without asking the user to click the checkbox a second time, and without dropping the click coordinates that would otherwise land in the solution salt as `(0, 0)`.
  
  Motivation. The in-flight dedupe added in the previous change only collapses `/captcha/{type}` POSTs that overlap in flight. A duplicate POST that fires ~1 s after the first has already settled (observed on iPhone WKWebView, incident 2026-07-01 21:23 UTC) still lands on a consumed session and returns `NO_SESSION_FOUND`. The pre-existing recovery for that case was a `setTimeout(restart, 100)` that tore the whole widget down and lost the checkbox click position.
  
  - `ProcaptchaProps` gains two optional props: `onSessionInvalidated(x?, y?)` and `startCoords: { x, y }`. Widgets not mounted under a recovery-aware parent still fall back to `frictionlessState.restart()`.
  - `procaptcha-pow`, `procaptcha-puzzle`, and `procaptcha-react` widgets now track the last `manager.start(x, y)` coords in a ref (either from the checkbox click or from `startCoords`) and, on the first `CAPTCHA.NO_SESSION_FOUND`, invoke `onSessionInvalidated(x, y)` instead of calling `restart()`. A per-instance ref makes it strictly one-shot — a second failure falls back to the existing restart path so a persistently broken session doesn't loop.
  - `ProcaptchaFrictionless` wires `onSessionInvalidated` through to each inner widget: it stashes the retry coords in a ref, re-runs its own `start()` (which re-invokes `/frictionless` and mints a fresh sessionId), then re-mounts the inner widget with `autoStart={true}` and `startCoords={x, y}`. The inner widget auto-fires `manager.start(x, y)` on mount so the eventual submit still embeds the real checkbox click position in the salt.
  - The recovery decision (one-shot fire, coord validation — `(0, 0)` and partial pairs are discarded because they're what an `autoStart` mount or an untrusted pointer event emits rather than a real click, and the consume-and-clear pending-coords ref) is extracted into `sessionInvalidatedRecovery.ts` with dedicated unit tests.
- Updated dependencies [18d0287]
  - @prosopo/types@4.9.3
  - @prosopo/procaptcha-pow@2.10.10
  - @prosopo/procaptcha-puzzle@2.10.25
  - @prosopo/procaptcha-react@2.9.83
  - @prosopo/api@3.5.10
  - @prosopo/detector@3.5.4
  - @prosopo/procaptcha-common@2.11.4

## 2.12.4
### Patch Changes

- 8814425: fix(api,procaptcha-frictionless): collapse the WKWebView "No session found" mount storm. Two independent client-side amplifiers were stacking to produce a cascade of `CAPTCHA.NO_SESSION_FOUND` errors during the frictionless → PoW hand-off in iPhone WKWebView.
  
  - `ProcaptchaFrictionless`'s outer `useEffect` depended on `[config, callbacks, detectBot, config.language]`. Host pages that recreate the `callbacks` object on every render (the common React pattern) refired the effect on each parent re-render and triggered a fresh `/frictionless` call each time. Deps are now the primitive widget identity (`config.account?.address`, `config.language`, `config.mode`) plus a `startedForKeyRef` guard, so React StrictMode double-invocation and same-identity re-renders are idempotent. `callbacks` and `detectBot` are still read live via the closure captured by `start()`.
  - `ProviderApi` had no in-flight guard on the three challenge-fetch calls, so a WKWebView duplicate POST (microseconds-apart) would race for the atomic `checkAndRemoveSession` on the same sessionId; the loser saw `NO_SESSION_FOUND`. A per-`(path, sessionId)` in-flight dedupe now attaches duplicate calls to the same Promise. Entry drops on settle, so a genuine retry after a real network error still fires a fresh POST; skipped when there's no sessionId to race on.
- Updated dependencies [8814425]
  - @prosopo/api@3.5.9
  - @prosopo/procaptcha-pow@2.10.9
  - @prosopo/procaptcha-puzzle@2.10.24
  - @prosopo/procaptcha-react@2.9.82

## 2.12.3
### Patch Changes

- Updated dependencies [f9e8c94]
- Updated dependencies [0983c51]
- Updated dependencies [7a434e0]
  - @prosopo/locale@3.2.6
  - @prosopo/procaptcha-pow@2.10.8
  - @prosopo/procaptcha-puzzle@2.10.23
  - @prosopo/types@4.9.2
  - @prosopo/common@3.1.43
  - @prosopo/procaptcha-react@2.9.81
  - @prosopo/api@3.5.8
  - @prosopo/detector@3.5.3
  - @prosopo/procaptcha-common@2.11.3

## 2.12.2
### Patch Changes

- 970bca2: feat(provider): record the page URL a frictionless session originated from and require it
  
  The frictionless client now reports the page it was rendered on (built from `window.location.origin + pathname`) in the challenge request, and the provider stores it on the session as `currentUrl`. The value is reduced to scheme + host + path on both the client and the provider (`sanitisePageUrl`): the query string, fragment and any embedded `user:pass@` credentials are stripped so URL-borne secrets (tokens, reset codes, session ids) are never persisted. A session whose request carries no usable page URL is treated as a bot signal and forced down the image-captcha path (`FrictionlessReason.MISSING_CURRENT_URL`).
- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/types@4.9.1
  - @prosopo/api@3.5.7
  - @prosopo/common@3.1.42
  - @prosopo/detector@3.5.2
  - @prosopo/procaptcha-common@2.11.2
  - @prosopo/procaptcha-pow@2.10.7
  - @prosopo/procaptcha-puzzle@2.10.22
  - @prosopo/procaptcha-react@2.9.80

## 2.12.1
### Patch Changes

- Updated dependencies [dfb0c53]
- Updated dependencies [6ecc576]
- Updated dependencies [619dc9f]
- Updated dependencies [11f1e8c]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
- Updated dependencies [6a7b122]
  - @prosopo/common@3.1.41
  - @prosopo/widget-skeleton@2.8.4
  - @prosopo/types@4.9.0
  - @prosopo/api@3.5.6
  - @prosopo/detector@3.5.1
  - @prosopo/procaptcha-common@2.11.1
  - @prosopo/procaptcha-pow@2.10.6
  - @prosopo/procaptcha-puzzle@2.10.21
  - @prosopo/procaptcha-react@2.9.79

## 2.12.0
### Minor Changes

- 12cd0a6: Replace client-side weighted-random provider selection with static DNS endpoints.
  
  - Removed the `providerSelectEntropy` field from `DetectorResult`, `Session`, the
    Mongoose `SessionRecordSchema` (including its standalone index), and every
    call-site that threaded it through frictionless / image / pow / puzzle flows.
  - Removed `FrictionlessManager.hostVerified` and its decision-machine call site
    — there's nothing to verify when the DNS layer picks the host.
  - `getRandomActiveProvider(env)` now returns the per-environment static DNS
    endpoint (`pronode.prosopo.io` family) instead of fetching the provider list
    and weighted-selecting. The entropy parameter is gone.
  - `getProcaptchaRandomActiveProvider` is now a thin re-export so widget packages
    keep importing from `procaptcha-common`.
  - `FrontendProvider.datasetId` is dropped; `CaptchaRequestBody.datasetId` is
    optional. The server falls back to its own most-recently-uploaded dataset
    (`env.datasetId`, populated from `db.getMostRecentDatasetId()` at startup) —
    clients can't pin a dataset under DNS routing because they don't know which
    pronode they'll hit.
  - Removed dead `setProviderLoader` / `prefetchProviders` / `selectWeightedProvider`
    plumbing from `@prosopo/load-balancer`. The server's cacheFile-based loader
    setup in `startProviderApi` goes with them.
  - `getRandomActiveProvider` now hits `/healthz` on the global hostname once per
    page load, reads the responding pronode's identity from the JSON body, and
    pins subsequent captcha calls to that pronode (`https://pronodeN.prosopo.io`)
    so session creation and submission land on the same backend. Falls back to
    the dual-stack global hostname when `/healthz` is unreachable.
  - `/healthz` now returns `{ ok: true, host: <pronode-identity> }` instead of
    `"OK"` to support the above pinning.
  - CORS preflight is now cached for 24h (`maxAge: 86400`) — previously the
    browser refired an OPTIONS preflight before every captcha call because
    the custom `Prosopo-Site-Key` / `Prosopo-User` headers make the request
    non-simple and the default `maxAge` is 5s.

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
- Updated dependencies [005b817]
- Updated dependencies [12cd0a6]
  - @prosopo/procaptcha-common@2.11.0
  - @prosopo/detector@3.5.0
  - @prosopo/api@3.5.5
  - @prosopo/types@4.8.0
  - @prosopo/procaptcha-react@2.9.78
  - @prosopo/procaptcha-pow@2.10.5
  - @prosopo/procaptcha-puzzle@2.10.20

## 2.11.11
### Patch Changes

- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4
  - @prosopo/api@3.5.4
  - @prosopo/detector@3.4.47
  - @prosopo/load-balancer@2.9.21
  - @prosopo/procaptcha-common@2.10.28
  - @prosopo/procaptcha-pow@2.10.4
  - @prosopo/procaptcha-puzzle@2.10.19
  - @prosopo/procaptcha-react@2.9.77

## 2.11.10
### Patch Changes

- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/api@3.5.3
  - @prosopo/detector@3.4.46
  - @prosopo/load-balancer@2.9.20
  - @prosopo/procaptcha-common@2.10.27
  - @prosopo/procaptcha-pow@2.10.3
  - @prosopo/procaptcha-puzzle@2.10.18
  - @prosopo/procaptcha-react@2.9.76

## 2.11.9
### Patch Changes

- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/types@4.7.2
  - @prosopo/locale@3.2.5
  - @prosopo/procaptcha-pow@2.10.2
  - @prosopo/procaptcha-puzzle@2.10.17
  - @prosopo/procaptcha-react@2.9.75
  - @prosopo/api@3.5.2
  - @prosopo/common@3.1.40
  - @prosopo/detector@3.4.45
  - @prosopo/load-balancer@2.9.19
  - @prosopo/procaptcha-common@2.10.26

## 2.11.8
### Patch Changes

- 46fedf4: Auto-start image/puzzle widget after PoW escalation so the user does not need to click the checkbox a second time.
- Updated dependencies [46fedf4]
  - @prosopo/procaptcha-react@2.9.74
  - @prosopo/procaptcha-puzzle@2.10.16
  - @prosopo/types@4.7.1
  - @prosopo/api@3.5.1
  - @prosopo/detector@3.4.44
  - @prosopo/load-balancer@2.9.18
  - @prosopo/procaptcha-common@2.10.25
  - @prosopo/procaptcha-pow@2.10.1

## 2.11.7
### Patch Changes

- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0
  - @prosopo/api@3.5.0
  - @prosopo/procaptcha-pow@2.10.0
  - @prosopo/detector@3.4.43
  - @prosopo/load-balancer@2.9.17
  - @prosopo/procaptcha-common@2.10.24
  - @prosopo/procaptcha-puzzle@2.10.15
  - @prosopo/procaptcha-react@2.9.73

## 2.11.6
### Patch Changes

- Updated dependencies [4626340]
  - @prosopo/types@4.6.1
  - @prosopo/api@3.4.14
  - @prosopo/detector@3.4.42
  - @prosopo/load-balancer@2.9.16
  - @prosopo/procaptcha-common@2.10.23
  - @prosopo/procaptcha-pow@2.9.10
  - @prosopo/procaptcha-puzzle@2.10.14
  - @prosopo/procaptcha-react@2.9.72

## 2.11.5
### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/types@4.6.0
  - @prosopo/procaptcha-pow@2.9.9
  - @prosopo/procaptcha-puzzle@2.10.13
  - @prosopo/procaptcha-react@2.9.71
  - @prosopo/api@3.4.13
  - @prosopo/common@3.1.39
  - @prosopo/detector@3.4.41
  - @prosopo/load-balancer@2.9.15
  - @prosopo/procaptcha-common@2.10.22

## 2.11.4
### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0
  - @prosopo/api@3.4.12
  - @prosopo/detector@3.4.40
  - @prosopo/load-balancer@2.9.14
  - @prosopo/procaptcha-common@2.10.21
  - @prosopo/procaptcha-pow@2.9.8
  - @prosopo/procaptcha-puzzle@2.10.12
  - @prosopo/procaptcha-react@2.9.70

## 2.11.3
### Patch Changes

- Updated dependencies [f69724f]
- Updated dependencies [3973078]
  - @prosopo/types@4.4.1
  - @prosopo/api@3.4.11
  - @prosopo/procaptcha-pow@2.9.7
  - @prosopo/procaptcha-puzzle@2.10.11
  - @prosopo/detector@3.4.39
  - @prosopo/load-balancer@2.9.13
  - @prosopo/procaptcha-common@2.10.20
  - @prosopo/procaptcha-react@2.9.69

## 2.11.2
### Patch Changes

- Updated dependencies [bc3813d]
- Updated dependencies [2d66d8e]
- Updated dependencies [4d05e3f]
  - @prosopo/types@4.4.0
  - @prosopo/procaptcha-react@2.9.68
  - @prosopo/api@3.4.10
  - @prosopo/detector@3.4.38
  - @prosopo/load-balancer@2.9.12
  - @prosopo/procaptcha-common@2.10.19
  - @prosopo/procaptcha-pow@2.9.6
  - @prosopo/procaptcha-puzzle@2.10.10

## 2.11.1
### Patch Changes

- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/api@3.4.9
  - @prosopo/detector@3.4.37
  - @prosopo/load-balancer@2.9.11
  - @prosopo/procaptcha-common@2.10.18
  - @prosopo/procaptcha-pow@2.9.5
  - @prosopo/procaptcha-puzzle@2.10.9
  - @prosopo/procaptcha-react@2.9.67

## 2.11.0
### Minor Changes

- 2392aaf: Integrate the prosopo/dns sidecar against the procaptcha provider.
  
  - New admin endpoint `POST /v1/prosopo/provider/admin/dns/event` ingests batched DNS observation events from the sidecar (auth: admin sr25519 JWT) and merges resolver / peer IPs onto the matching Session record under a new `Session.dnsEvent` field.
  - Frictionless response carries a per-session `dns_url` when the pronode has `DNS_EVENT_SUBZONE` + `DNS_EVENT_HMAC_SECRET` set. The HMAC path mirrors the sidecar's Rust implementation so both sides agree without shared per-request state.
  - The frictionless bundle fires one no-cors GET to `dns_url` on detection completion (fire-and-forget; failures never affect the captcha flow).
  - `dns_url` is included on the `reuse_session` short-circuit path too, not only the new-session path — otherwise repeat visits from the same user/IP/sitekey combination silently dropped the observation hop.
  - Deploy compose entry for the sidecar plus a Caddy `layer4` SNI-passthrough block so the sidecar terminates TLS itself (no Cloudflare token needed). Caddy image must be rebuilt with the `caddy-l4` plugin.

### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
  - @prosopo/types@4.3.0
  - @prosopo/api@3.4.8
  - @prosopo/common@3.1.38
  - @prosopo/detector@3.4.36
  - @prosopo/load-balancer@2.9.10
  - @prosopo/procaptcha-common@2.10.17
  - @prosopo/procaptcha-pow@2.9.4
  - @prosopo/procaptcha-puzzle@2.10.8
  - @prosopo/procaptcha-react@2.9.66

## 2.10.3
### Patch Changes

- Updated dependencies [d3db08d]
  - @prosopo/procaptcha-common@2.10.16
  - @prosopo/procaptcha-react@2.9.65
  - @prosopo/procaptcha-pow@2.9.3
  - @prosopo/procaptcha-puzzle@2.10.7

## 2.10.2
### Patch Changes

- 6c26669: Add per-site honeypot trap. When enabled, the provider attaches an encoded question (morse or semaphore, base64-wrapped) in the `x-prosopo-meta` response header on frictionless responses. The widget renders the value into an off-screen hidden input with `name="email_confirm"`; bots that auto-fill text inputs populate it and the value rides back on the solution submit as `clientMetaData.hp`, which is persisted on the `StoredCaptcha` record. Falls back to a random phrase from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH` when no custom question is configured.
- f7f9ec5: feat(provider,widget): reserved always-pass / always-fail test site keys
  
  Add two fixed, well-known reserved site keys (`ALWAYS_PASS_SITE_KEY` /
  `ALWAYS_FAIL_SITE_KEY`) that force a deterministic captcha verdict for CI/CD and
  integration testing, constant across production, staging and development.
  
  - `@prosopo/types`: shared constants + `getTestSiteKeyMode`, imported by both the
    provider and the widget.
  - `@prosopo/provider`: short-circuits the `submit*` and `verify` endpoints (verify
    runs before the signature check, so no dapp secret is needed), serves an
    invisible PoW session from the frictionless handler, and bypasses domain
    middleware. Works in every environment with no DB record.
  - `@prosopo/procaptcha-common` / `-react` / `-frictionless`: render a prominent
    `TestModeBanner` warning (always pass/fail) plus a console warning so a test key
    can never ship to production unnoticed.
  
  always-pass verifies at both the submit and verify layers; always-fail fails at
  both. Safe in production by design: the override only weakens protection for a
  dapp that deliberately opts in, mirroring reCAPTCHA's public test keys.
- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/api@3.4.7
  - @prosopo/procaptcha-react@2.9.64
  - @prosopo/procaptcha-pow@2.9.2
  - @prosopo/procaptcha-puzzle@2.10.6
  - @prosopo/procaptcha-common@2.10.15
  - @prosopo/detector@3.4.35
  - @prosopo/load-balancer@2.9.9

## 2.10.1
### Patch Changes

- Updated dependencies [0fd81af]
  - @prosopo/common@3.1.37
  - @prosopo/load-balancer@2.9.8
  - @prosopo/procaptcha-pow@2.9.1
  - @prosopo/procaptcha-puzzle@2.10.5
  - @prosopo/procaptcha-react@2.9.63
  - @prosopo/procaptcha-common@2.10.14

## 2.10.0
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
  - @prosopo/procaptcha-pow@2.9.0
  - @prosopo/api@3.4.6
  - @prosopo/detector@3.4.34
  - @prosopo/load-balancer@2.9.7
  - @prosopo/procaptcha-common@2.10.13
  - @prosopo/procaptcha-puzzle@2.10.4
  - @prosopo/procaptcha-react@2.9.62

## 2.9.6
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4
  - @prosopo/api@3.4.5
  - @prosopo/detector@3.4.33
  - @prosopo/load-balancer@2.9.6
  - @prosopo/procaptcha-common@2.10.12
  - @prosopo/procaptcha-pow@2.8.62
  - @prosopo/procaptcha-puzzle@2.10.3
  - @prosopo/procaptcha-react@2.9.61

## 2.9.5
### Patch Changes

- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/types@4.1.3
  - @prosopo/locale@3.2.4
  - @prosopo/procaptcha-pow@2.8.61
  - @prosopo/procaptcha-puzzle@2.10.2
  - @prosopo/procaptcha-react@2.9.60
  - @prosopo/api@3.4.4
  - @prosopo/common@3.1.36
  - @prosopo/detector@3.4.32
  - @prosopo/load-balancer@2.9.5
  - @prosopo/procaptcha-common@2.10.11

## 2.9.4
### Patch Changes

- Updated dependencies [566c1f6]
  - @prosopo/widget-skeleton@2.8.3
  - @prosopo/procaptcha-pow@2.8.60
  - @prosopo/procaptcha-puzzle@2.10.1
  - @prosopo/procaptcha-react@2.9.59
  - @prosopo/types@4.1.2
  - @prosopo/procaptcha-common@2.10.10
  - @prosopo/api@3.4.3
  - @prosopo/detector@3.4.31
  - @prosopo/load-balancer@2.9.4

## 2.9.3
### Patch Changes

- 53bfd45: Detect when the widget is served over plain HTTP (an insecure browser context)
  and show a clear "Procaptcha requires a secure (HTTPS) connection" message
  instead of failing later with a cryptic `Provider Selection Failed` error.
  Procaptcha depends on secure-context-only browser APIs (e.g. SubtleCrypto), so
  the frictionless widget now short-circuits before the provider-selection retry
  loop when `window.isSecureContext` is false. Adds the `WIDGET.INSECURE_CONTEXT`
  translation key across all locales and an `isSecureBrowserContext` helper.
- Updated dependencies [53bfd45]
- Updated dependencies [91958da]
  - @prosopo/procaptcha-common@2.10.9
  - @prosopo/locale@3.2.3
  - @prosopo/procaptcha-puzzle@2.10.0
  - @prosopo/api@3.4.2
  - @prosopo/types@4.1.1
  - @prosopo/procaptcha-pow@2.8.59
  - @prosopo/procaptcha-react@2.9.58
  - @prosopo/common@3.1.35
  - @prosopo/detector@3.4.30
  - @prosopo/load-balancer@2.9.3

## 2.9.2
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/api@3.4.1
  - @prosopo/detector@3.4.29
  - @prosopo/load-balancer@2.9.2
  - @prosopo/procaptcha-common@2.10.8
  - @prosopo/procaptcha-pow@2.8.58
  - @prosopo/procaptcha-puzzle@2.9.2
  - @prosopo/procaptcha-react@2.9.57

## 2.9.1
### Patch Changes

- cc13a45: Defer the SIMD benchmark trigger to after the frictionless POST is in
  flight, and stop attaching SIMD readings to the frictionless request
  body. The previous `await detectionResult.getSimdReadings(0)` still
  waited a microtask cycle and the full RSA-OAEP + AES-GCM encryption
  (10–30ms) even when `timeoutMs` was `0`, and the benchmark itself —
  a CPU-bound WASM loop — was running concurrently with the BotScore
  worker, contending for cores on small VMs. Stretches like 344ms →
  1167ms on staging were attributable to the contention.
  
  The first-hop-wins semantics on the provider mean we just lose the
  frictionless-hop attach, not the signal — readings still attach on the
  captcha challenge GET and on solution submit.
  - @prosopo/procaptcha-common@2.10.7
  - @prosopo/procaptcha-pow@2.8.57
  - @prosopo/procaptcha-puzzle@2.9.1
  - @prosopo/procaptcha-react@2.9.56

## 2.9.0
### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.

### Patch Changes

- 4aae4e6: Pull the frictionless POST critical path down by ~340ms on the test
  hardware via four focused changes:
  
  - **Inline Signer.** `@polkadot/extension-base/page/Signer` is now a
    static import in `ExtensionWeb2`. It's 0.5KB on disk but its dynamic
    import was costing ~190ms of network round-trip; inlining removes
    one separate chunk fetch + parse from the critical path.
  
  - **Pre-warm the CryptoWorker.** `CryptoWorkerManager` gains a public
    `prewarm()` that actually spawns the Worker and lets its script
    parse during chunk-load time. Previously the call at module load
    only instantiated the manager class; the worker itself spun up
    lazily on the first `runTask`, putting the ~500ms worker module-eval
    inside the first `createAccount()` call. Now it overlaps with chunk
    loading and is hot by the time it's needed.
  
  - **Prefetch providers at module load with an env-keyed cache.**
    `prefetchProviders` and `getRandomActiveProvider` share an in-flight
    `Promise<HardcodedProvider[]>` keyed by environment, so a module-load
    prefetch and the later `customDetectBot` Promise.all reuse the same
    network call. `procaptcha-frictionless` triggers the prefetch from
    module-import time using `PROSOPO_DEFAULT_ENVIRONMENT` (browser-safe
    `typeof process` guard + `EnvironmentTypesSchema.safeParse`), so the
    HTTP fetch overlaps with chunk download instead of running as part
    of the detection Promise.all.
  
  - **Lazy-load the three captcha solvers.** `ProcaptchaFrictionless`
    no longer statically imports `Procaptcha`, `ProcaptchaPuzzle`, and
    `ProcaptchaPow`; each is `await import(...)` at the point the
    frictionless response picks a type. Two of the three wrappers used
    to be dead weight in the initial bundle; now only the chosen solver
    is downloaded, after the frictionless POST has fired. Pulls ~64KB
    of solver UI (chosen wrapper + Emotion dev runtime + builder + lazy
    shim) out of the initial captchaRenderer chunk.
  
  Combined with the earlier worker-related changes, the frictionless POST
  on the puzzle-implicit test page is now ~1290ms vs ~1630ms before this
  batch, and ~6500ms in the original baseline. The remaining floor is
  dominated by the BotScoreWorker's obfuscated bundle parse + run.
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
- Updated dependencies [4aae4e6]
- Updated dependencies [d865319]
- Updated dependencies [273926d]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4993813]
- Updated dependencies [5f1ae53]
  - @prosopo/types@4.0.0
  - @prosopo/api@3.4.0
  - @prosopo/load-balancer@2.9.1
  - @prosopo/locale@3.2.2
  - @prosopo/procaptcha-puzzle@2.9.0
  - @prosopo/procaptcha-pow@2.8.56
  - @prosopo/common@3.1.34
  - @prosopo/widget-skeleton@2.8.2
  - @prosopo/detector@3.4.28
  - @prosopo/procaptcha-common@2.10.6
  - @prosopo/procaptcha-react@2.9.55

## 2.8.62
### Patch Changes

- 819ed95: Adding invisible mode to session data
- Updated dependencies [819ed95]
- Updated dependencies [33a6c57]
  - @prosopo/types@3.16.1
  - @prosopo/api@3.3.2
  - @prosopo/load-balancer@2.9.0
  - @prosopo/detector@3.4.27
  - @prosopo/procaptcha-common@2.10.5
  - @prosopo/procaptcha-pow@2.8.55
  - @prosopo/procaptcha-react@2.9.54

## 2.8.61
### Patch Changes

- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types@3.16.0
  - @prosopo/api@3.3.1
  - @prosopo/detector@3.4.26
  - @prosopo/load-balancer@2.8.40
  - @prosopo/procaptcha-common@2.10.4
  - @prosopo/procaptcha-pow@2.8.54
  - @prosopo/procaptcha-react@2.9.53

## 2.8.60
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0
  - @prosopo/api@3.3.0
  - @prosopo/detector@3.4.25
  - @prosopo/load-balancer@2.8.39
  - @prosopo/procaptcha-common@2.10.3
  - @prosopo/procaptcha-pow@2.8.53
  - @prosopo/procaptcha-react@2.9.52

## 2.8.59
### Patch Changes

- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
- Updated dependencies [b94890c]
  - @prosopo/types@3.14.1
  - @prosopo/locale@3.2.1
  - @prosopo/api@3.2.11
  - @prosopo/common@3.1.33
  - @prosopo/detector@3.4.24
  - @prosopo/load-balancer@2.8.38
  - @prosopo/procaptcha-common@2.10.2
  - @prosopo/procaptcha-pow@2.8.52
  - @prosopo/procaptcha-react@2.9.51

## 2.8.58
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
  - @prosopo/procaptcha-pow@2.8.51
  - @prosopo/procaptcha-react@2.9.50
  - @prosopo/common@3.1.32
  - @prosopo/detector@3.4.23
  - @prosopo/load-balancer@2.8.37

## 2.8.57
### Patch Changes

- Updated dependencies [73df23c]
- Updated dependencies [8139819]
- Updated dependencies [4a9c518]
  - @prosopo/procaptcha-common@2.10.0
  - @prosopo/widget-skeleton@2.8.0
  - @prosopo/common@3.1.31
  - @prosopo/procaptcha-pow@2.8.50
  - @prosopo/procaptcha-react@2.9.49
  - @prosopo/load-balancer@2.8.36

## 2.8.56
### Patch Changes

  - @prosopo/procaptcha-pow@2.8.49
  - @prosopo/procaptcha-react@2.9.48
  - @prosopo/types@3.13.3
  - @prosopo/procaptcha-common@2.9.41
  - @prosopo/api@3.2.9
  - @prosopo/detector@3.4.22
  - @prosopo/load-balancer@2.8.35

## 2.8.55
### Patch Changes

  - @prosopo/procaptcha-pow@2.8.48
  - @prosopo/procaptcha-react@2.9.47
  - @prosopo/types@3.13.2
  - @prosopo/procaptcha-common@2.9.40
  - @prosopo/api@3.2.8
  - @prosopo/detector@3.4.21
  - @prosopo/load-balancer@2.8.34

## 2.8.54
### Patch Changes

- Updated dependencies [20192d2]
  - @prosopo/widget-skeleton@2.7.14
  - @prosopo/procaptcha-pow@2.8.47
  - @prosopo/procaptcha-react@2.9.46
  - @prosopo/types@3.13.1
  - @prosopo/procaptcha-common@2.9.39
  - @prosopo/api@3.2.7
  - @prosopo/detector@3.4.20
  - @prosopo/load-balancer@2.8.33

## 2.8.53
### Patch Changes

- Updated dependencies [e6d9553]
  - @prosopo/types@3.13.0
  - @prosopo/procaptcha-pow@2.8.46
  - @prosopo/procaptcha-react@2.9.45
  - @prosopo/api@3.2.6
  - @prosopo/detector@3.4.19
  - @prosopo/load-balancer@2.8.32
  - @prosopo/procaptcha-common@2.9.38

## 2.8.52
### Patch Changes

- 730c61e: Speed up captcha
- Updated dependencies [730c61e]
- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/load-balancer@2.8.31
  - @prosopo/detector@3.4.18
  - @prosopo/types@3.12.3
  - @prosopo/procaptcha-common@2.9.37
  - @prosopo/api@3.2.5
  - @prosopo/procaptcha-pow@2.8.45
  - @prosopo/procaptcha-react@2.9.44

## 2.8.51
### Patch Changes

- Updated dependencies [dbcd098]
- Updated dependencies [adb89a6]
  - @prosopo/detector@3.4.17
  - @prosopo/locale@3.1.29
  - @prosopo/types@3.12.2
  - @prosopo/api@3.2.4
  - @prosopo/common@3.1.30
  - @prosopo/procaptcha-pow@2.8.44
  - @prosopo/procaptcha-react@2.9.43
  - @prosopo/load-balancer@2.8.30
  - @prosopo/procaptcha-common@2.9.36

## 2.8.50
### Patch Changes

- Updated dependencies [f5c8725]
  - @prosopo/detector@3.4.16

## 2.8.49
### Patch Changes

- Updated dependencies [c5ee492]
- Updated dependencies [a90eb54]
  - @prosopo/common@3.1.29
  - @prosopo/types@3.12.1
  - @prosopo/load-balancer@2.8.29
  - @prosopo/procaptcha-pow@2.8.43
  - @prosopo/procaptcha-react@2.9.42
  - @prosopo/api@3.2.3
  - @prosopo/detector@3.4.15
  - @prosopo/procaptcha-common@2.9.35

## 2.8.48
### Patch Changes

- Updated dependencies [759d4e6]
- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/detector@3.4.14
  - @prosopo/load-balancer@2.8.28
  - @prosopo/types@3.12.0
  - @prosopo/procaptcha-common@2.9.34
  - @prosopo/api@3.2.2
  - @prosopo/procaptcha-pow@2.8.42
  - @prosopo/procaptcha-react@2.9.41

## 2.8.47
### Patch Changes

- Updated dependencies [8148587]
  - @prosopo/detector@3.4.13
  - @prosopo/types@3.11.1
  - @prosopo/api@3.2.1
  - @prosopo/load-balancer@2.8.27
  - @prosopo/procaptcha-common@2.9.33
  - @prosopo/procaptcha-pow@2.8.41
  - @prosopo/procaptcha-react@2.9.40

## 2.8.46
### Patch Changes

- Updated dependencies [5444635]
  - @prosopo/detector@3.4.12

## 2.8.45
### Patch Changes

- Updated dependencies [7f6ffc5]
  - @prosopo/types@3.11.0
  - @prosopo/api@3.2.0
  - @prosopo/procaptcha-react@2.9.39
  - @prosopo/detector@3.4.11
  - @prosopo/load-balancer@2.8.26
  - @prosopo/procaptcha-common@2.9.32
  - @prosopo/procaptcha-pow@2.8.40

## 2.8.44
### Patch Changes

- Updated dependencies [bca43e5]
  - @prosopo/detector@3.4.10

## 2.8.43
### Patch Changes

- Updated dependencies [ce4f831]
- Updated dependencies [93fa086]
- Updated dependencies [4de47f5]
  - @prosopo/detector@3.4.9
  - @prosopo/types@3.10.2
  - @prosopo/api@3.1.49
  - @prosopo/load-balancer@2.8.25
  - @prosopo/procaptcha-common@2.9.31
  - @prosopo/procaptcha-pow@2.8.39
  - @prosopo/procaptcha-react@2.9.38

## 2.8.42
### Patch Changes

- Updated dependencies [cde7550]
  - @prosopo/types@3.10.1
  - @prosopo/api@3.1.48
  - @prosopo/detector@3.4.8
  - @prosopo/load-balancer@2.8.24
  - @prosopo/procaptcha-common@2.9.30
  - @prosopo/procaptcha-pow@2.8.38
  - @prosopo/procaptcha-react@2.9.37

## 2.8.41
### Patch Changes

- Updated dependencies [ad6d622]
  - @prosopo/types@3.10.0
  - @prosopo/api@3.1.47
  - @prosopo/detector@3.4.7
  - @prosopo/load-balancer@2.8.23
  - @prosopo/procaptcha-common@2.9.29
  - @prosopo/procaptcha-pow@2.8.37
  - @prosopo/procaptcha-react@2.9.36

## 2.8.40
### Patch Changes

- Updated dependencies [ff58a70]
- Updated dependencies [592adf1]
  - @prosopo/types@3.9.0
  - @prosopo/procaptcha-react@2.9.35
  - @prosopo/procaptcha-pow@2.8.36
  - @prosopo/api@3.1.46
  - @prosopo/detector@3.4.6
  - @prosopo/load-balancer@2.8.22
  - @prosopo/procaptcha-common@2.9.28

## 2.8.39
### Patch Changes

  - @prosopo/procaptcha-react@2.9.34

## 2.8.38
### Patch Changes

- Updated dependencies [d2431cd]
  - @prosopo/types@3.8.4
  - @prosopo/api@3.1.45
  - @prosopo/detector@3.4.5
  - @prosopo/load-balancer@2.8.21
  - @prosopo/procaptcha-common@2.9.27
  - @prosopo/procaptcha-pow@2.8.35
  - @prosopo/procaptcha-react@2.9.33

## 2.8.37
### Patch Changes

  - @prosopo/procaptcha-react@2.9.32

## 2.8.36
### Patch Changes

- Updated dependencies [bd6995b]
  - @prosopo/detector@3.4.4
  - @prosopo/types@3.8.3
  - @prosopo/api@3.1.44
  - @prosopo/load-balancer@2.8.20
  - @prosopo/procaptcha-common@2.9.26
  - @prosopo/procaptcha-pow@2.8.34
  - @prosopo/procaptcha-react@2.9.31

## 2.8.35
### Patch Changes

- Updated dependencies [9633e58]
  - @prosopo/types@3.8.2
  - @prosopo/api@3.1.43
  - @prosopo/detector@3.4.3
  - @prosopo/load-balancer@2.8.19
  - @prosopo/procaptcha-common@2.9.25
  - @prosopo/procaptcha-pow@2.8.33
  - @prosopo/procaptcha-react@2.9.30

## 2.8.34
### Patch Changes

- Updated dependencies [f52a5c1]
  - @prosopo/types@3.8.1
  - @prosopo/api@3.1.42
  - @prosopo/detector@3.4.2
  - @prosopo/load-balancer@2.8.18
  - @prosopo/procaptcha-common@2.9.24
  - @prosopo/procaptcha-pow@2.8.32
  - @prosopo/procaptcha-react@2.9.29

## 2.8.33
### Patch Changes

  - @prosopo/procaptcha-react@2.9.28

## 2.8.32
### Patch Changes

- Updated dependencies [15254a3]
  - @prosopo/detector@3.4.1

## 2.8.31
### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- 3acc333: Release 3.3.0
- Updated dependencies [a53526b]
- Updated dependencies [f3cf586]
- Updated dependencies [3acc333]
- Updated dependencies [3acc333]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [6a4d57d]
- Updated dependencies [7543d17]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
- Updated dependencies [4ac7ef0]
  - @prosopo/procaptcha-pow@2.8.31
  - @prosopo/procaptcha-common@2.9.23
  - @prosopo/detector@3.4.0
  - @prosopo/types@3.8.0
  - @prosopo/procaptcha-react@2.9.27
  - @prosopo/widget-skeleton@2.7.13
  - @prosopo/load-balancer@2.8.17
  - @prosopo/common@3.1.28
  - @prosopo/locale@3.1.28
  - @prosopo/api@3.1.41

## 2.8.30
### Patch Changes

  - @prosopo/procaptcha-react@2.9.26

## 2.8.29
### Patch Changes

- Updated dependencies [c6faa77]
  - @prosopo/detector@3.3.24

## 2.8.28
### Patch Changes

  - @prosopo/procaptcha-react@2.9.25

## 2.8.27
### Patch Changes

- caf53e2: Async user creation
- Updated dependencies [caf53e2]
  - @prosopo/detector@3.3.23

## 2.8.26
### Patch Changes

- Updated dependencies [ea5f1f8]
  - @prosopo/detector@3.3.22

## 2.8.25
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/procaptcha-pow@2.8.30
  - @prosopo/types@3.7.2
  - @prosopo/api@3.1.40
  - @prosopo/detector@3.3.21
  - @prosopo/load-balancer@2.8.16
  - @prosopo/procaptcha-common@2.9.22
  - @prosopo/procaptcha-react@2.9.24

## 2.8.24
### Patch Changes

- Updated dependencies [345b25b]
  - @prosopo/procaptcha-pow@2.8.29
  - @prosopo/types@3.7.1
  - @prosopo/api@3.1.39
  - @prosopo/detector@3.3.20
  - @prosopo/load-balancer@2.8.15
  - @prosopo/procaptcha-common@2.9.21
  - @prosopo/procaptcha-react@2.9.23

## 2.8.23
### Patch Changes

- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [5ad6f48]
- Updated dependencies [f6b5094]
- Updated dependencies [e01227b]
  - @prosopo/types@3.7.0
  - @prosopo/detector@3.3.19
  - @prosopo/locale@3.1.27
  - @prosopo/api@3.1.38
  - @prosopo/common@3.1.27
  - @prosopo/load-balancer@2.8.14
  - @prosopo/procaptcha-common@2.9.20
  - @prosopo/procaptcha-pow@2.8.28
  - @prosopo/procaptcha-react@2.9.22

## 2.8.22
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/api@3.1.37
  - @prosopo/common@3.1.26
  - @prosopo/detector@3.3.18
  - @prosopo/load-balancer@2.8.13
  - @prosopo/locale@3.1.26
  - @prosopo/procaptcha-common@2.9.19
  - @prosopo/procaptcha-pow@2.8.27
  - @prosopo/procaptcha-react@2.9.21
  - @prosopo/types@3.6.4
  - @prosopo/widget-skeleton@2.7.12

## 2.8.21
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/api@3.1.36
  - @prosopo/common@3.1.25
  - @prosopo/detector@3.3.17
  - @prosopo/load-balancer@2.8.12
  - @prosopo/locale@3.1.25
  - @prosopo/procaptcha-common@2.9.18
  - @prosopo/procaptcha-pow@2.8.26
  - @prosopo/procaptcha-react@2.9.20
  - @prosopo/types@3.6.3
  - @prosopo/widget-skeleton@2.7.11

## 2.8.20
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/procaptcha-common@2.9.17
  - @prosopo/procaptcha-react@2.9.19
  - @prosopo/widget-skeleton@2.7.10
  - @prosopo/procaptcha-pow@2.8.25
  - @prosopo/load-balancer@2.8.11
  - @prosopo/detector@3.3.16
  - @prosopo/common@3.1.24
  - @prosopo/locale@3.1.24
  - @prosopo/types@3.6.2
  - @prosopo/api@3.1.35

## 2.8.19
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/api@3.1.34
  - @prosopo/common@3.1.23
  - @prosopo/detector@3.3.15
  - @prosopo/load-balancer@2.8.10
  - @prosopo/locale@3.1.23
  - @prosopo/procaptcha-common@2.9.16
  - @prosopo/procaptcha-pow@2.8.24
  - @prosopo/procaptcha-react@2.9.18
  - @prosopo/types@3.6.1
  - @prosopo/widget-skeleton@2.7.9

## 2.8.18
### Patch Changes

- Updated dependencies [9128d5e]
- Updated dependencies [9128d5e]
  - @prosopo/procaptcha-common@2.9.15
  - @prosopo/procaptcha-pow@2.8.23
  - @prosopo/procaptcha-react@2.9.17

## 2.8.17
### Patch Changes

  - @prosopo/procaptcha-react@2.9.16

## 2.8.16
### Patch Changes

  - @prosopo/procaptcha-react@2.9.15

## 2.8.15
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [aa8216a]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/types@3.6.0
  - @prosopo/detector@3.3.14
  - @prosopo/procaptcha-common@2.9.14
  - @prosopo/procaptcha-react@2.9.14
  - @prosopo/widget-skeleton@2.7.8
  - @prosopo/procaptcha-pow@2.8.22
  - @prosopo/load-balancer@2.8.9
  - @prosopo/common@3.1.22
  - @prosopo/locale@3.1.22
  - @prosopo/api@3.1.33
  - @prosopo/config@3.1.22

## 2.8.14
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/api@3.1.32
  - @prosopo/detector@3.3.13
  - @prosopo/load-balancer@2.8.8
  - @prosopo/procaptcha-common@2.9.13
  - @prosopo/procaptcha-pow@2.8.21
  - @prosopo/procaptcha-react@2.9.13

## 2.8.13
### Patch Changes

- cb8ab85: head entropy for bot detection
- Updated dependencies [cb8ab85]
  - @prosopo/detector@3.3.12
  - @prosopo/types@3.5.10
  - @prosopo/api@3.1.31
  - @prosopo/load-balancer@2.8.7
  - @prosopo/procaptcha-common@2.9.12
  - @prosopo/procaptcha-pow@2.8.20
  - @prosopo/procaptcha-react@2.9.12

## 2.8.12
### Patch Changes

- Updated dependencies [43907e8]
- Updated dependencies [005ce66]
- Updated dependencies [b58046d]
- Updated dependencies [7101036]
  - @prosopo/types@3.5.9
  - @prosopo/load-balancer@2.8.6
  - @prosopo/api@3.1.30
  - @prosopo/detector@3.3.11
  - @prosopo/procaptcha-common@2.9.11
  - @prosopo/procaptcha-pow@2.8.19
  - @prosopo/procaptcha-react@2.9.11

## 2.8.11
### Patch Changes

- Updated dependencies [e5c259d]
  - @prosopo/detector@3.3.10
  - @prosopo/types@3.5.8
  - @prosopo/api@3.1.29
  - @prosopo/load-balancer@2.8.5
  - @prosopo/procaptcha-common@2.9.10
  - @prosopo/procaptcha-pow@2.8.18
  - @prosopo/procaptcha-react@2.9.10

## 2.8.10
### Patch Changes

- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
- Updated dependencies [3a027ef]
  - @prosopo/api@3.1.28
  - @prosopo/common@3.1.21
  - @prosopo/config@3.1.21
  - @prosopo/detector@3.3.9
  - @prosopo/procaptcha-pow@2.8.17
  - @prosopo/load-balancer@2.8.4
  - @prosopo/procaptcha-react@2.9.9
  - @prosopo/locale@3.1.21
  - @prosopo/procaptcha-common@2.9.9
  - @prosopo/types@3.5.7
  - @prosopo/widget-skeleton@2.7.7

## 2.8.9
### Patch Changes

- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/api@3.1.27
  - @prosopo/detector@3.3.8
  - @prosopo/load-balancer@2.8.3
  - @prosopo/procaptcha-common@2.9.8
  - @prosopo/procaptcha-pow@2.8.16
  - @prosopo/procaptcha-react@2.9.8

## 2.8.8
### Patch Changes

- Updated dependencies [494c5a8]
  - @prosopo/types@3.5.5
  - @prosopo/api@3.1.26
  - @prosopo/detector@3.3.7
  - @prosopo/load-balancer@2.8.2
  - @prosopo/procaptcha-common@2.9.7
  - @prosopo/procaptcha-pow@2.8.15
  - @prosopo/procaptcha-react@2.9.7

## 2.8.7
### Patch Changes

- Updated dependencies [08ff50f]
  - @prosopo/types@3.5.4
  - @prosopo/api@3.1.25
  - @prosopo/detector@3.3.6
  - @prosopo/load-balancer@2.8.1
  - @prosopo/procaptcha-common@2.9.6
  - @prosopo/procaptcha-pow@2.8.14
  - @prosopo/procaptcha-react@2.9.6

## 2.8.6
### Patch Changes

- Updated dependencies [04d0f1a]
- Updated dependencies [1e3a838]
  - @prosopo/load-balancer@2.8.0
  - @prosopo/detector@3.3.5
  - @prosopo/config@3.1.20
  - @prosopo/procaptcha-common@2.9.5
  - @prosopo/api@3.1.24
  - @prosopo/common@3.1.20
  - @prosopo/locale@3.1.20
  - @prosopo/procaptcha-pow@2.8.13
  - @prosopo/procaptcha-react@2.9.5
  - @prosopo/types@3.5.3
  - @prosopo/widget-skeleton@2.7.6

## 2.8.5
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/procaptcha-common@2.9.4
  - @prosopo/procaptcha-react@2.9.4
  - @prosopo/widget-skeleton@2.7.5
  - @prosopo/procaptcha-pow@2.8.12
  - @prosopo/load-balancer@2.7.12
  - @prosopo/detector@3.3.4
  - @prosopo/locale@3.1.19
  - @prosopo/types@3.5.2
  - @prosopo/api@3.1.23
  - @prosopo/config@3.1.19

## 2.8.4
### Patch Changes

- 52cd544: Integrity checks
- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b8cc590]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/detector@3.3.3
  - @prosopo/types@3.5.1
  - @prosopo/procaptcha-common@2.9.3
  - @prosopo/procaptcha-react@2.9.3
  - @prosopo/widget-skeleton@2.7.4
  - @prosopo/procaptcha-pow@2.8.11
  - @prosopo/load-balancer@2.7.11
  - @prosopo/common@3.1.18
  - @prosopo/locale@3.1.18
  - @prosopo/api@3.1.22
  - @prosopo/config@3.1.18

## 2.8.3
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/procaptcha-common@2.9.2
  - @prosopo/procaptcha-react@2.9.2
  - @prosopo/widget-skeleton@2.7.3
  - @prosopo/procaptcha-pow@2.8.10
  - @prosopo/load-balancer@2.7.10
  - @prosopo/detector@3.3.2
  - @prosopo/common@3.1.17
  - @prosopo/locale@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/api@3.1.21
  - @prosopo/config@3.1.17

## 2.8.2
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/procaptcha-common@2.9.1
  - @prosopo/procaptcha-react@2.9.1
  - @prosopo/widget-skeleton@2.7.2
  - @prosopo/procaptcha-pow@2.8.9
  - @prosopo/load-balancer@2.7.9
  - @prosopo/detector@3.3.1
  - @prosopo/common@3.1.16
  - @prosopo/locale@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/api@3.1.20
  - @prosopo/config@3.1.16

## 2.8.1
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/procaptcha-common@2.9.0
  - @prosopo/procaptcha-react@2.9.0
  - @prosopo/widget-skeleton@2.7.1
  - @prosopo/procaptcha-pow@2.8.8
  - @prosopo/load-balancer@2.7.8
  - @prosopo/detector@3.3.0
  - @prosopo/common@3.1.15
  - @prosopo/locale@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/api@3.1.19
  - @prosopo/config@3.1.15

## 2.8.0
### Minor Changes

- 97edf3f: Adding dom manip checks

### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
- Updated dependencies [72810f4]
  - @prosopo/widget-skeleton@2.7.0
  - @prosopo/detector@3.2.0
  - @prosopo/types@3.3.0
  - @prosopo/procaptcha-common@2.8.7
  - @prosopo/procaptcha-react@2.8.7
  - @prosopo/procaptcha-pow@2.8.7
  - @prosopo/load-balancer@2.7.7
  - @prosopo/common@3.1.14
  - @prosopo/locale@3.1.14
  - @prosopo/api@3.1.18
  - @prosopo/config@3.1.14

## 2.7.6
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [5137f01]
- Updated dependencies [0555cd8]
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/detector@3.1.6
  - @prosopo/types@3.2.1
  - @prosopo/procaptcha-common@2.8.6
  - @prosopo/procaptcha-react@2.8.6
  - @prosopo/widget-skeleton@2.6.14
  - @prosopo/procaptcha-pow@2.8.6
  - @prosopo/load-balancer@2.7.6
  - @prosopo/common@3.1.13
  - @prosopo/locale@3.1.13
  - @prosopo/api@3.1.17
  - @prosopo/config@3.1.13

## 2.7.5
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [0824221]
- Updated dependencies [72810f4]
  - @prosopo/types@3.2.0
  - @prosopo/procaptcha-common@2.8.5
  - @prosopo/procaptcha-react@2.8.5
  - @prosopo/widget-skeleton@2.6.13
  - @prosopo/procaptcha-pow@2.8.5
  - @prosopo/load-balancer@2.7.5
  - @prosopo/detector@3.1.5
  - @prosopo/common@3.1.12
  - @prosopo/locale@3.1.12
  - @prosopo/api@3.1.16
  - @prosopo/config@3.1.12

## 2.7.4
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/types@3.1.4
  - @prosopo/procaptcha-common@2.8.4
  - @prosopo/procaptcha-react@2.8.4
  - @prosopo/widget-skeleton@2.6.12
  - @prosopo/procaptcha-pow@2.8.4
  - @prosopo/load-balancer@2.7.4
  - @prosopo/detector@3.1.4
  - @prosopo/common@3.1.11
  - @prosopo/api@3.1.15
  - @prosopo/config@3.1.11

## 2.7.3
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [36b23e0]
- Updated dependencies [657a827]
  - @prosopo/api@3.1.14
  - @prosopo/procaptcha-common@2.8.3
  - @prosopo/procaptcha-react@2.8.3
  - @prosopo/widget-skeleton@2.6.11
  - @prosopo/procaptcha-pow@2.8.3
  - @prosopo/load-balancer@2.7.3
  - @prosopo/detector@3.1.3
  - @prosopo/common@3.1.10
  - @prosopo/locale@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/config@3.1.10

## 2.7.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/procaptcha-common@2.8.2
  - @prosopo/procaptcha-react@2.8.2
  - @prosopo/widget-skeleton@2.6.10
  - @prosopo/procaptcha-pow@2.8.2
  - @prosopo/load-balancer@2.7.2
  - @prosopo/detector@3.1.2
  - @prosopo/common@3.1.9
  - @prosopo/locale@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/api@3.1.13
  - @prosopo/config@3.1.9

## 2.7.1
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/load-balancer@2.7.1
  - @prosopo/detector@3.1.1
  - @prosopo/types@3.1.1
  - @prosopo/procaptcha-common@2.8.1
  - @prosopo/procaptcha-react@2.8.1
  - @prosopo/widget-skeleton@2.6.9
  - @prosopo/procaptcha-pow@2.8.1
  - @prosopo/common@3.1.8
  - @prosopo/locale@3.1.8
  - @prosopo/api@3.1.12
  - @prosopo/config@3.1.8

## 2.7.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/procaptcha-common@2.8.0
  - @prosopo/procaptcha-react@2.8.0
  - @prosopo/widget-skeleton@2.6.8
  - @prosopo/procaptcha-pow@2.8.0
  - @prosopo/load-balancer@2.7.0
  - @prosopo/detector@3.1.0
  - @prosopo/common@3.1.7
  - @prosopo/locale@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/api@3.1.11
  - @prosopo/config@3.1.7

## 2.6.39
### Patch Changes

- 9eed772: Release 3.1.12
- a07db04: Release 3.1.12
- Updated dependencies [b4442f0]
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
  - @prosopo/procaptcha-react@2.7.0
  - @prosopo/procaptcha-pow@2.7.25
  - @prosopo/config@3.1.6
  - @prosopo/api@3.1.10
  - @prosopo/common@3.1.6
  - @prosopo/detector@3.0.7
  - @prosopo/locale@3.1.6
  - @prosopo/procaptcha-common@2.7.18
  - @prosopo/types@3.0.10
  - @prosopo/widget-skeleton@2.6.7

## 2.6.38
### Patch Changes

  - @prosopo/api@3.1.9
  - @prosopo/procaptcha-pow@2.7.24
  - @prosopo/procaptcha-react@2.6.38

## 2.6.37
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/locale@3.1.5
  - @prosopo/procaptcha-common@2.7.17
  - @prosopo/procaptcha-react@2.6.37
  - @prosopo/widget-skeleton@2.6.6
  - @prosopo/procaptcha-pow@2.7.23
  - @prosopo/detector@3.0.6
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9
  - @prosopo/api@3.1.8

## 2.6.36
### Patch Changes

- 30e7d4d: Fixing coverage report and more damn linting
- 857c614: Adding timeouts to frictionless requests to providers to stop hangs
- Updated dependencies [30e7d4d]
  - @prosopo/procaptcha-react@2.6.36
  - @prosopo/procaptcha-pow@2.7.22
  - @prosopo/config@3.1.5
  - @prosopo/detector@3.0.5
  - @prosopo/locale@3.1.4
  - @prosopo/types@3.0.8
  - @prosopo/widget-skeleton@2.6.5

## 2.6.35
### Patch Changes

- 1f3a02f: Release 3.1.8
- Updated dependencies [1f3a02f]
  - @prosopo/procaptcha-react@2.6.35
  - @prosopo/procaptcha-pow@2.7.21

## 2.6.34
### Patch Changes

- 926df8a: lint
- Updated dependencies [926df8a]
  - @prosopo/procaptcha-react@2.6.34
  - @prosopo/procaptcha-pow@2.7.20

## 2.6.33
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/detector@3.0.4
  - @prosopo/locale@3.1.3
  - @prosopo/procaptcha-pow@2.7.19
  - @prosopo/procaptcha-react@2.6.33
  - @prosopo/types@3.0.7
  - @prosopo/widget-skeleton@2.6.4

## 2.6.32
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
  - @prosopo/procaptcha-react@2.6.32
  - @prosopo/widget-skeleton@2.6.3
  - @prosopo/procaptcha-pow@2.7.18
  - @prosopo/detector@3.0.3
  - @prosopo/types@3.0.6
  - @prosopo/config@3.1.3
  - @prosopo/locale@3.1.2

## 2.6.31
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/procaptcha-react@2.6.31
  - @prosopo/widget-skeleton@2.6.2
  - @prosopo/procaptcha-pow@2.7.17
  - @prosopo/detector@3.0.2
  - @prosopo/locale@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/config@3.1.2

## 2.6.30
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.16
  - @prosopo/procaptcha-react@2.6.30

## 2.6.29
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [2f0c830]
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/detector@3.0.1
  - @prosopo/widget-skeleton@2.6.1
  - @prosopo/locale@3.1.0
  - @prosopo/types@3.0.4
  - @prosopo/procaptcha-react@2.6.29
  - @prosopo/procaptcha-pow@2.7.15
  - @prosopo/config@3.1.1

## 2.6.28
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.14
  - @prosopo/procaptcha-react@2.6.28

## 2.6.27
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.13
  - @prosopo/procaptcha-react@2.6.27

## 2.6.26
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.12
  - @prosopo/procaptcha-react@2.6.26

## 2.6.25
### Patch Changes

- Updated dependencies [b0d7207]
  - @prosopo/types@3.0.3
  - @prosopo/procaptcha-pow@2.7.11
  - @prosopo/procaptcha-react@2.6.25

## 2.6.24
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.10
  - @prosopo/procaptcha-react@2.6.24

## 2.6.23
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.9
  - @prosopo/procaptcha-react@2.6.23

## 2.6.22
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/locale@3.0.2
  - @prosopo/types@3.0.2
  - @prosopo/procaptcha-pow@2.7.8
  - @prosopo/procaptcha-react@2.6.22

## 2.6.21
### Patch Changes

- Updated dependencies [87bd9bc]
  - @prosopo/locale@3.0.1
  - @prosopo/procaptcha-pow@2.7.7
  - @prosopo/procaptcha-react@2.6.21
  - @prosopo/types@3.0.1

## 2.6.20
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.6
  - @prosopo/procaptcha-react@2.6.20

## 2.6.19
### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/detector@3.0.0
  - @prosopo/locale@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/procaptcha-pow@2.7.5
  - @prosopo/procaptcha-react@2.6.19

## 2.6.18
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0
  - @prosopo/procaptcha-pow@2.7.4
  - @prosopo/procaptcha-react@2.6.18

## 2.6.17
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/procaptcha-react@2.6.17
  - @prosopo/procaptcha-pow@2.7.3
  - @prosopo/types@2.9.1

## 2.6.16
### Patch Changes

  - @prosopo/procaptcha-pow@2.7.2
  - @prosopo/procaptcha-react@2.6.16

## 2.6.15
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/types@2.9.0
  - @prosopo/procaptcha-pow@2.7.1
  - @prosopo/procaptcha-react@2.6.15

## 2.6.14
### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/procaptcha-pow@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/procaptcha-react@2.6.14

## 2.6.13
### Patch Changes

- cf26d7e: Prevents the translation key (WIDGET.I_AM_HUMAN) to be shown until the translation is loaded
- Updated dependencies [cf26d7e]
  - @prosopo/procaptcha-pow@2.6.13
  - @prosopo/procaptcha-react@2.6.13

## 2.6.12

### Patch Changes

- ea38a1c: lint
- Updated dependencies [ea38a1c]
  - @prosopo/procaptcha-react@2.6.12
  - @prosopo/procaptcha-pow@2.6.12

## 2.6.11

### Patch Changes

- b2ae723: lint
- Updated dependencies [b2ae723]
  - @prosopo/procaptcha-react@2.6.11
  - @prosopo/procaptcha-pow@2.6.11

## 2.6.10

### Patch Changes

- d17c67f: lint
- Updated dependencies [d17c67f]
  - @prosopo/procaptcha-react@2.6.10
  - @prosopo/procaptcha-pow@2.6.10

## 2.6.9

### Patch Changes

- 0d194f2: lint
- Updated dependencies [0d194f2]
  - @prosopo/procaptcha-react@2.6.9
  - @prosopo/procaptcha-pow@2.6.9

## 2.6.8

### Patch Changes

- @prosopo/procaptcha-pow@2.6.8
- @prosopo/procaptcha-react@2.6.8
- @prosopo/types@2.7.1

## 2.6.7

### Patch Changes

- bc892fa: lint
- Updated dependencies [bc892fa]
  - @prosopo/procaptcha-react@2.6.7
  - @prosopo/procaptcha-pow@2.6.7

## 2.6.6

### Patch Changes

- 84fc39f: lint
- Updated dependencies [84fc39f]
  - @prosopo/procaptcha-react@2.6.6
  - @prosopo/procaptcha-pow@2.6.6

## 2.6.5

### Patch Changes

- 5656b0c: Adding cypress tests for invisible
- 5656b0c: Adding all client examples to bundle example
- Updated dependencies [5656b0c]
- Updated dependencies [5656b0c]
  - @prosopo/procaptcha-react@2.6.5
  - @prosopo/procaptcha-pow@2.6.5
  - @prosopo/detector@2.6.1

## 2.6.4

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0
  - @prosopo/procaptcha-pow@2.6.4
  - @prosopo/procaptcha-react@2.6.4

## 2.6.3

### Patch Changes

- @prosopo/procaptcha-pow@2.6.3
- @prosopo/procaptcha-react@2.6.3

## 2.6.2

### Patch Changes

- 6ff193a: Change settings type
- Updated dependencies [6ff193a]
  - @prosopo/procaptcha-react@2.6.2
  - @prosopo/procaptcha-pow@2.6.2
  - @prosopo/types@2.6.2

## 2.6.1

### Patch Changes

- Updated dependencies [52feffc]
  - @prosopo/types@2.6.1
  - @prosopo/procaptcha-pow@2.6.1
  - @prosopo/procaptcha-react@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/detector@2.6.0
  - @prosopo/locale@2.6.0
  - @prosopo/procaptcha-pow@2.6.0
  - @prosopo/procaptcha-react@2.6.0
  - @prosopo/types@2.6.0
  - @prosopo/widget-skeleton@2.6.0
