# @prosopo/types

## 4.2.0
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

- 4d9923e: feat: optional `storeMetadata` site setting persists `/verify` metadata
  
  Adds a per-site-key boolean `storeMetadata` (default `false`) to
  `ClientSettingsSchema` / `UserSettingsSchema`. When enabled, the provider
  writes the dapp-server-forwarded metadata that arrives on the image, PoW
  and puzzle `/verify` endpoints onto the corresponding captcha record under
  a new `metadata` sub-document (`{ email?: string }` today; more fields
  will be added here as the verify payload grows).
  
  `providedIp` stays top-level — existing data and indexes already use it,
  and it predates this setting.
  
  Off by default. Existing spam-email checks still inspect the submitted
  email unconditionally — this setting only gates **storage** of metadata
  so the submitted values can be sampled later to judge whether traffic is
  mostly spam.

## 4.1.4
### Patch Changes

- d351362: fix: replace `$or + $expr` unstored-records sweep with a `pendingStage` sentinel
  
  The `StoreCommitmentsExternal` background job fetches "records that still
  need to be shipped to the central DB" via
  `{ $or: [ { storedAtTimestamp: { $exists: false } }, { $expr: { $lt: [$storedAtTimestamp, $lastUpdatedTimestamp] } } ] }`.
  `$expr` is unindexable (per-doc computation) and combined with `$or`
  defeats the planner entirely — production was running this every sweep
  as a `IXSCAN { _id: 1 }` collection scan, examining ~673K powcaptcha
  docs, ~240K usercommitments docs, and ~60K sessions docs per pass. On
  the worst-affected nodes this thrashed the WiredTiger cache (10h of
  cumulative app-thread blocking on disk reads in 43h of uptime) and made
  every other Mongo lookup (including the frictionless session dedup
  queries) slow by eviction — manifesting as traffic-correlated provider
  latency starting 2026-05-26.
  
  Replace the query semantics with a `pendingStage: true` sentinel:
  
  - New optional `pendingStage` field on `StoredCaptcha` and `Session`
    (Zod + TS + Mongoose schemas).
  - New tiny partial index per collection:
    `{ pendingStage: 1 }` with `partialFilterExpression: { pendingStage: true }`.
    Indexes only the rows that need staging — typically a tiny rolling set,
    ~20 KB for a 700K-row collection with 100 pending rows in local tests.
  - Write paths (`storeXxx`, `updateXxx`, `markXxxChecked`, approve /
    disapprove, `checkAndRemoveSession`, `recordSessionSimdReadingsIfAbsent`,
    `storePendingImageCommitment`) set `pendingStage: true` alongside the
    existing `lastUpdatedTimestamp` bump.
  - `markXxxStored` and the per-record streamer mark-stored callbacks
    `$unset: { pendingStage: 1 }` alongside the `storedAtTimestamp` write,
    guarded by `lastUpdatedTimestamp: { $lte: ts }` so an in-flight update
    doesn't get its pending flag cleared by an older stage completion.
  - `markXxxStored` bulk methods accept an `asOfTimestamp` argument; the
    sweep passes the time it fetched the batch so the guard is correct
    across the full ship-then-mark round trip.
  - `getUnstoredXxx` queries become `{ pendingStage: true }` sorted by
    `_id` — uses the new partial index, examines only pending docs.
  
  Local verification on a 700,100-doc test collection: old query ~549 ms
  examining 700,100 docs; new query 0 ms examining 100 docs. Index storage
  ~20 KB.

## 4.1.3
### Patch Changes

- e2711ae: feat(provider): add `autoBanScoreThreshold` client setting and frictionless auto-ban
  
  Adds an optional `autoBanScoreThreshold` to `ClientSettingsSchema`. When set,
  the frictionless decision machine blocks any request whose detector score is
  at or above the threshold with HTTP 401 instead of issuing an image or PoW
  challenge — useful for clients receiving floods of image solves from sessions
  scoring at or above 1.
  
  The check runs first in `runDecisionMachine`, before the existing
  user-agent / context-aware / webview / timestamp / threshold gates, so score
  bumps applied by those gates cannot bypass it. Blocked sessions are persisted
  via `registerBlockedSession` with the new `FrictionlessReason.AUTO_BAN_SCORE`
  reason.
  
  Undefined threshold = disabled; existing clients are unaffected.
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
- Updated dependencies [6567ce0]
- Updated dependencies [5786629]
  - @prosopo/util@3.2.14
  - @prosopo/locale@3.2.4

## 4.1.2
### Patch Changes

- Updated dependencies [72a1218]
  - @prosopo/util@3.2.13

## 4.1.1
### Patch Changes

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
- Updated dependencies [53bfd45]
  - @prosopo/locale@3.2.3

## 4.1.0
### Minor Changes

- 6a741ce: Move `FrictionlessReason` into `@prosopo/types` and add a new
  `ResultReason` enum covering the values previously inlined as string
  literals on `result.reason` (API.CAPTCHA_PASSED, API.VPN_BLOCKED,
  EMAIL_INVALID, etc.). Provider task code now references the enums so the
  canonical list of selection/result reasons lives in one place and can be
  imported by non-server packages (portal, audit tooling) without pulling
  in `@prosopo/provider`. The previous `FrictionlessReason` export from
  `@prosopo/provider` is preserved as a re-export for backwards
  compatibility.
  
  `CaptchaResult.reason`, `StoredCaptcha.result.reason`, `Session.result.reason`
  are now typed `ResultReason | undefined`; `Session.reason` is typed
  `FrictionlessReason | undefined`. The runtime zod schema stays permissive
  (`string().optional().transform(v => v as ResultReason | undefined)`) so
  operator-authored decision-machine output and old MongoDB records still
  parse without throwing; the strict enum is preserved on the TS surface
  via the transform.

## 4.0.0
### Major Changes

- 8bb7286: Move `captchaType` from client (`data-captcha-type` / render-options prop)
  to a server-side site-key setting; the bundle now calls `/frictionless`
  for all flows. Renames the bundle's universal mount component from
  `FrictionlessCaptcha` to `BundleCaptcha` to reflect that it is no longer
  frictionless-specific — the server decides which concrete challenge type
  to render.

### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.
- 753304b: Extend the existing decision-machine artifact with a new `route` phase that
  selects the concrete captcha type during the frictionless flow. Per-sitekey
  JS sources (Dapp > Global priority) can now override the ladder's image/pow
  baseline based on Redis-backed usage counters keyed by IP and userAccount.
  
  Adds:
  
  - `RoutingMachineInput`, `RoutingMachineOutput`, `CounterSpec`,
    `CounterWindow` etc. in `@prosopo/types`.
  - A `usageCounters` primitive in the provider (Lua INCR + TTL-on-first;
    bulk MGET) and fire-and-forget served/solved counter writes at the
    three captcha types.
  - `DecisionMachineRunner.route()` and `.getRequiredCounters()` alongside
    the existing `decide()` veto. Artifact cache is now shared across all
    runner instances and busted on admin PUT for immediate propagation.
  - `applyRouter` helper in the frictionless flow which falls back to the
    ladder baseline on any machine/Redis failure.
  
  Back-compat: existing post-PoW verify-phase machines keep working
  unchanged. A single artifact can export both `route` and `verify` /
  `decide`.

### Patch Changes

- 3c0be68: Add a new admin-only endpoint `POST /v1/prosopo/provider/admin/counters/clear-all`
  for deleting per-sitekey usage counters from Redis. Intended for manual
  testing of routing decision machines and staging-environment resets — not
  part of the hot path.
  
  - `ClearAllCountersBody` (optional `dapp`) and `ClearAllCountersResponse`
    (`success`, `deletedCount`, `scope`) zod schemas in `@prosopo/types`,
    plus `AdminApiPaths.ClearAllCounters` and a 10/60s rate limit.
  - `UsageCounters.clearAll(dappAccount?)` in the provider, using Redis
    `SCAN` + `DEL` in 500-key batches. Returns null on Redis failure so
    callers can surface the underlying error.
  - `ApiClearAllCountersEndpoint` wired through `ApiAdminRoutesProvider`.
  - `ProviderApi.clearAllCounters(jwt, dappAccount?)` client method.
- f9ea09d: Drop flat ipinfo fields (`vpn`, `countryCode`, `tor`, `proxy`, `datacenter`, `abuser`, `geolocation`) from captcha records — persist the full `IPInfoResponse` payload as `ipInfo` instead
  
  The provider's `ipInfoMiddleware` already calls `ipInfoService.lookup()` on every captcha request and attaches the result to `req.ipInfo`. Persisting that whole payload on every captcha record means the portal sees the *exact* response the traffic filter consulted, with no cherry-picked-field translation layer in between. Adding a new flag in the future (e.g. `isMobile`) requires zero schema changes — it's already in the payload.
  
  - `StoredCaptcha` interface: removed `vpn`, `countryCode`, `geolocation`. Keeps `ipInfo?: IPInfoResponse`.
  - `PoWCaptchaStoredSchema` zod validator: same removals, adds `ipInfo` (validated as `any()` since `IPInfoResponse` is a discriminated union narrowed at read time).
  - PoW, Puzzle, UserCommitment mongoose schemas in `@prosopo/types-database`: same removals. UserCommitment now also has `ipInfo` (previously only PoW + Puzzle did). Replaced `{ countryCode: 1 }` index with `{ "ipInfo.countryCode": 1 }` + `{ "ipInfo.isVPN": 1 }`.
  - `IProviderDatabase` interface: `storePowCaptchaRecord` / `storePuzzleCaptchaRecord` / `storePendingImageCommitment` now take `ipInfo?: IPInfoResponse` in place of `countryCode?: string`.
  - Provider call sites (`getPoWCaptchaChallenge.ts`, `getPuzzleCaptchaChallenge.ts`, `getImageCaptchaChallenge.ts`, `submitImageCaptchaSolution.ts`) pass `req.ipInfo` directly. The earlier "prefer session.countryCode, fallback to req's countryCode" branching is gone — record `ipInfo` reflects what was true at challenge-issuance time.
  - Provider read sites (`powTasks.ts`, `puzzleTasks.ts`, `imgCaptchaTasks.ts`) narrow `record.ipInfo?.isValid` then read `.countryCode` for access-policy / decision-machine input — same effective value, derived from the persisted payload.
  - Lean projections in `provider.ts` switched from `countryCode: 1` to `ipInfo: 1`.
  
  Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339), which updates the CHECK_IP_INFO backfill job (now writes the full payload, query becomes `{ ipInfo: { $exists: false } }`), the portal search models / aggregation pipeline (read nested `ipInfo.*`), and the anomaly detectors.
- f9ea09d: Drop flat `countryCode` / `geolocation` fields from Session records — persist the full `IPInfoResponse` payload as `session.ipInfo` instead
  
  Brings sessions in line with captcha records (PoW / Puzzle / UserCommitment), which already store the full payload. The provider's `ipInfoMiddleware` populates `req.ipInfo` at session-creation time; that whole payload now lives on the session, so consumers narrow on `session.ipInfo?.isValid` and read whichever sub-field they need (countryCode, isVPN, isMobile, isTor, ...).
  
  - `Session` interface + `SessionSchema` zod (`@prosopo/types`): replace `countryCode?: string` / `geolocation?: string` with `ipInfo?: IPInfoResponse`.
  - `SessionRecordSchema` mongoose (`@prosopo/types-database`): same.
  - `FrictionlessManager.setSessionParams` / `createSession`: accept `ipInfo` instead of `countryCode`.
  - `getFrictionlessCaptchaChallenge.ts` call sites (10 of them — `sendImageCaptcha`, `sendPowCaptcha`, `registerBlockedSession`, etc.) pass `req.ipInfo` instead of `countryCode`.
  - `CaptchaManager.isValidRequest()` return: drop dead `countryCode: sessionRecord.countryCode` field (no caller was destructuring it after the earlier refactor), surface `ipInfo: sessionRecord.ipInfo` instead for callers that want it.
  - Two new MongoMemory roundtrip tests in `ipInfoPersistence.integration.test.ts` cover Session.ipInfo (valid response + error response). `routingDecisionMachines.integration.test.ts` fixture updated to write the full payload.
  
  `RoutingContext.countryCode` is unchanged — that's a transient runtime struct fed into the routing machine, not a stored record. Callers of `setRoutingContext` already derive `countryCode` from `req.ipInfo.countryCode` at the API boundary.
  
  Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
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
- Updated dependencies [4aae4e6]
  - @prosopo/locale@3.2.2
  - @prosopo/util@3.2.12

## 3.16.1
### Patch Changes

- 819ed95: Adding invisible mode to session data

## 3.16.0
### Minor Changes

- 99dfb44: Pass back reason via verify calls

### Patch Changes

- f6a4402: API endpoint for removing site keys

## 3.15.0
### Minor Changes

- 3e54c0a: Rate limits by client

## 3.14.1
### Patch Changes

- 946a8ba: Abuser score threshold
- 5614814: Small config changes
- Updated dependencies [b94890c]
  - @prosopo/locale@3.2.1

## 3.14.0
### Minor Changes

- 42650db: Add better spam rules and move ipinfo service to local instead of external

### Patch Changes

- fc514dd: ability to block different types of traffic
- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/locale@3.2.0

## 3.13.3
### Patch Changes

- Updated dependencies [a25dffa]
  - @prosopo/util@3.2.11

## 3.13.2
### Patch Changes

- Updated dependencies [346edd7]
  - @prosopo/util@3.2.10

## 3.13.1
### Patch Changes

- Updated dependencies [22bfee7]
  - @prosopo/util@3.2.9

## 3.13.0
### Minor Changes

- e6d9553: Add `registerSiteKeys` bulk endpoint (`POST /v1/prosopo/provider/admin/sitekeys/register`) that accepts an array of site key records, allowing multiple client records to be registered in a single request.

### Patch Changes

- Updated dependencies [e0fb3d6]
- Updated dependencies [f3f23e3]
  - @prosopo/util@3.2.8

## 3.12.3
### Patch Changes

- d5082a9: Don't require email type
- e1ea65f: Better spam email domain checking
- c316257: Adding sync fo sessions wrt captcha status
- Updated dependencies [e1ea65f]
  - @prosopo/util@3.2.7

## 3.12.2
### Patch Changes

- adb89a6: Disposable email checking
- Updated dependencies [adb89a6]
  - @prosopo/locale@3.1.29
  - @prosopo/util@3.2.6

## 3.12.1
### Patch Changes

- a90eb54: We know WHAT happens but we don't know WHY happens

## 3.12.0
### Minor Changes

- feaca02: Max image rounds

### Patch Changes

- 676c5f2: Use HTTPS in developmentwq

## 3.11.1
### Patch Changes

- 8148587: Clustering

## 3.11.0
### Minor Changes

- 7f6ffc5: Store behavioural for image challenges

## 3.10.2
### Patch Changes

- 93fa086: Add decision engine endpoints

## 3.10.1
### Patch Changes

- cde7550: enhance/frictionless-headers-db-field

## 3.10.0
### Minor Changes

- ad6d622: Separate types from mongoose schemas to avoid bundling mongoose in frontend

## 3.9.0
### Minor Changes

- ff58a70: Load the geolocation service at startup only

## 3.8.4
### Patch Changes

- d2431cd: Allow IP validation rules to be disabled

## 3.8.3
### Patch Changes

- bd6995b: Adding UAP based geoblocking rules

## 3.8.2
### Patch Changes

- 9633e58: Add captcha type to decision machine and run on image verification"

## 3.8.1
### Patch Changes

- f52a5c1: Adding decision machine to provider for behavior detection

## 3.8.0
### Minor Changes

- 1ee3d80: More API fixes

### Patch Changes

- 3acc333: Add JWT issuance to keypairs
- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- 3acc333: Release 3.3.0
- Updated dependencies [a53526b]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [a8faa9a]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/util@3.2.5
  - @prosopo/util-crypto@13.5.29
  - @prosopo/locale@3.1.28

## 3.7.2
### Patch Changes

- 141e462: Capture correct event

## 3.7.1
### Patch Changes

- 345b25b: pow coord

## 3.7.0
### Minor Changes

- ce70a2b: Add context-aware entropy calculation for WebView and default contexts
  
  - Added ContextType enum to distinguish between WebView and default browser contexts
  - Implemented context-specific entropy calculation and storage
  - Created clientContextEntropy collection with automatic timestamp management
  - Removed legacy clientEntropy table in favor of context-specific approach
  - Added helper functions for context determination and threshold retrieval
  - Included comprehensive unit tests for context validation logic

### Patch Changes

- c2b940f: Properly save context type settings
- f6b5094: Allow different context to override default
- Updated dependencies [e01227b]
  - @prosopo/locale@3.1.27

## 3.6.4
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/locale@3.1.26
  - @prosopo/util@3.2.4
  - @prosopo/util-crypto@13.5.28

## 3.6.3
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/locale@3.1.25
  - @prosopo/util@3.2.3
  - @prosopo/util-crypto@13.5.27

## 3.6.2
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/util-crypto@13.5.26
  - @prosopo/locale@3.1.24
  - @prosopo/util@3.2.2

## 3.6.1
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/locale@3.1.23
  - @prosopo/util@3.2.1
  - @prosopo/util-crypto@13.5.25

## 3.6.0
### Minor Changes

- bb5f41c: Context awareness

### Patch Changes

- 15ae7cf: Change slider defaults
- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/util@3.2.0
  - @prosopo/util-crypto@13.5.24
  - @prosopo/locale@3.1.22
  - @prosopo/config@3.1.22

## 3.5.11
### Patch Changes

- 8f1773a: Tweak config

## 3.5.10
### Patch Changes

- cb8ab85: head entropy for bot detection

## 3.5.9
### Patch Changes

- 43907e8: Convert timestamp fields from numbers to Date objects throughout codebase
- 7101036: Force consistent IPs logic
- Updated dependencies [005ce66]
  - @prosopo/util@3.1.7

## 3.5.8
### Patch Changes

- e5c259d: .

## 3.5.7
### Patch Changes

- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21
  - @prosopo/locale@3.1.21
  - @prosopo/util@3.1.6
  - @prosopo/util-crypto@13.5.23

## 3.5.6
### Patch Changes

- 5d11a81: Adding maintenance mode

## 3.5.5
### Patch Changes

- 494c5a8: Updated payload

## 3.5.4
### Patch Changes

- 08ff50f: Hot fix country code

## 3.5.3
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/locale@3.1.20
  - @prosopo/util@3.1.5
  - @prosopo/util-crypto@13.5.22

## 3.5.2
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/util-crypto@13.5.21
  - @prosopo/locale@3.1.19
  - @prosopo/util@3.1.4
  - @prosopo/config@3.1.19

## 3.5.1
### Patch Changes

- 52cd544: Integrity checks
- b117ba3: Hot fix country code
- 50c4120: Release 3.4.3
- Updated dependencies [50c4120]
  - @prosopo/util-crypto@13.5.20
  - @prosopo/locale@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/config@3.1.18

## 3.5.0
### Minor Changes

- e20ad6b: IP country overrides

### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
  - @prosopo/util-crypto@13.5.19
  - @prosopo/locale@3.1.17
  - @prosopo/util@3.1.2
  - @prosopo/config@3.1.17

## 3.4.1
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
  - @prosopo/util-crypto@13.5.18
  - @prosopo/locale@3.1.16
  - @prosopo/util@3.1.1
  - @prosopo/config@3.1.16

## 3.4.0
### Minor Changes

- 6768f14: Update salt

### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/util-crypto@13.5.17
  - @prosopo/locale@3.1.15
  - @prosopo/util@3.1.0
  - @prosopo/config@3.1.15

## 3.3.0
### Minor Changes

- 97edf3f: Adding dom manip checks

### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/util-crypto@13.5.16
  - @prosopo/locale@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/config@3.1.14

## 3.2.1
### Patch Changes

- 509be28: Fix IP conditions logic
- 008d112: Release 3.3.0
- Updated dependencies [008d112]
  - @prosopo/util-crypto@13.5.15
  - @prosopo/locale@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/config@3.1.13

## 3.2.0
### Minor Changes

- cf48565: Store additional details. Remove duplicate indexes.

### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [0824221]
  - @prosopo/util-crypto@13.5.14
  - @prosopo/locale@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/config@3.1.12

## 3.1.4
### Patch Changes

- 0d1a33e: Adding ipcomparison service with user features
- 0d1a33e: Adding ip comparison service
- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/util-crypto@13.5.13
  - @prosopo/util@3.0.14
  - @prosopo/config@3.1.11

## 3.1.3
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/util-crypto@13.5.12
  - @prosopo/locale@3.1.10
  - @prosopo/util@3.0.13
  - @prosopo/config@3.1.10

## 3.1.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- 1249ce0: Be more lenient with random provider selection
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [809b984]
  - @prosopo/util-crypto@13.5.11
  - @prosopo/locale@3.1.9
  - @prosopo/util@3.0.12
  - @prosopo/config@3.1.9

## 3.1.1
### Patch Changes

- 1f980c4: Fix types mismatch in decryption
- 6fe8570: Release 3.2.0
- Updated dependencies [6fe8570]
  - @prosopo/util-crypto@13.5.10
  - @prosopo/locale@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/config@3.1.8

## 3.1.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
  - @prosopo/util-crypto@13.5.9
  - @prosopo/locale@3.1.7
  - @prosopo/util@3.0.10
  - @prosopo/config@3.1.7

## 3.0.10
### Patch Changes

- Updated dependencies [9eed772]
- Updated dependencies [ebb0168]
  - @prosopo/config@3.1.6
  - @prosopo/util@3.0.9
  - @prosopo/locale@3.1.6
  - @prosopo/util-crypto@13.5.8

## 3.0.9
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/locale@3.1.5
  - @prosopo/util-crypto@13.5.7
  - @prosopo/util@3.0.8

## 3.0.8
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/common@3.1.4
  - @prosopo/locale@3.1.4

## 3.0.7
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/locale@3.1.3

## 3.0.6
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
- df4e030: Revising UAP rule getters
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
  - @prosopo/common@3.1.2
  - @prosopo/config@3.1.3
  - @prosopo/locale@3.1.2

## 3.0.5
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/common@3.1.1
  - @prosopo/locale@3.1.1
  - @prosopo/config@3.1.2

## 3.0.4
### Patch Changes

- 93d5e50: ensure packages have @prosopo/config as dep for vite configs
- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 93d5e50: fix missing dep for @prosopo/config
- 63519d7: Tests
- 3573f0b: standardise all vite based npm scripts for bundling
- 2d0dd8a: Integration tests for UAPs
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/locale@3.1.0
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.0.3
### Patch Changes

- b0d7207: Types for proper rotation

## 3.0.2
### Patch Changes

- f682f0c: Moving type and fixing i18n config
- Updated dependencies [f682f0c]
  - @prosopo/locale@3.0.2
  - @prosopo/common@3.0.2

## 3.0.1
### Patch Changes

- Updated dependencies [87bd9bc]
  - @prosopo/locale@3.0.1
  - @prosopo/common@3.0.1

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/locale@3.0.0

## 2.10.0
### Minor Changes

- aee3efe: Add healthz endpoint

## 2.9.1
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/common@2.7.2

## 2.9.0
### Minor Changes

- 30bb383: Making sure verify works and derived accounts

### Patch Changes

  - @prosopo/common@2.7.1

## 2.8.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0

## 2.7.1

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1

## 2.7.0

### Minor Changes

- 6e1aef6: Add IP check when verifying

## 2.6.2

### Patch Changes

- 6ff193a: Change settings type

## 2.6.1

### Patch Changes

- 52feffc: Adjustable difficulty img captcha

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/common@2.6.0
  - @prosopo/locale@2.6.0
