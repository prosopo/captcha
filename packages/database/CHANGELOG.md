# @prosopo/database

## 3.15.12
### Patch Changes

- 29b5c6a: Include `currentUrl` and `iframeUrl` in the `getSessionRecordBySessionId` projection so `buildEscalation` forwards them onto the escalated session. Without this, every post-PoW routed session was persisted with `currentUrl: undefined`, dropping URL attribution on the PoW → image/puzzle hop.
- Updated dependencies [6abff15]
- Updated dependencies [b07b448]
  - @prosopo/logger@2.0.3
  - @prosopo/user-access-policy@3.12.3
  - @prosopo/common@3.1.45
  - @prosopo/redis-client@1.0.29
  - @prosopo/types-database@4.11.11

## 3.15.11
### Patch Changes

- Updated dependencies [85e8857]
  - @prosopo/types@4.9.8
  - @prosopo/types-database@4.11.10
  - @prosopo/util@3.3.4
  - @prosopo/user-access-policy@3.12.2
  - @prosopo/common@3.1.44
  - @prosopo/logger@2.0.2
  - @prosopo/redis-client@1.0.28

## 3.15.10
### Patch Changes

- 494883f: Add a sparse compound index on `{ isEscalation: 1, createdAt: 1 }` to the Session collection. Sparse so ordinary frictionless sessions (which omit the field) don't add index entries.
- 8bde5df: Persist `isEscalation: true` on Session records minted by the post-PoW routing machine.
  
  The escalation path in `submitPoWCaptchaSolution.buildEscalation` creates a follow-up session (image or puzzle) whenever the router decides the PoW-verified user still needs a stronger challenge. Analytics couldn't previously separate those escalated sessions from cold frictionless sessions since both shared the same shape — every downstream count that wanted to reason about "did we escalate this user?" had to reverse-engineer the origin/escalation link from the redis cache mapping.
  
  The field is optional on the schema and only written when true, so ordinary frictionless sessions stay slim and older records still parse.
- Updated dependencies [494883f]
- Updated dependencies [8bde5df]
  - @prosopo/types-database@4.11.9
  - @prosopo/types@4.9.7
  - @prosopo/user-access-policy@3.12.1

## 3.15.9
### Patch Changes

- Updated dependencies [7d7e767]
- Updated dependencies [b3f351b]
- Updated dependencies [17bc76e]
  - @prosopo/user-access-policy@3.12.0
  - @prosopo/types@4.9.6
  - @prosopo/types-database@4.11.8

## 3.15.8
### Patch Changes

- Updated dependencies [6cb3218]
  - @prosopo/types@4.9.5
  - @prosopo/types-database@4.11.7
  - @prosopo/user-access-policy@3.11.3

## 3.15.7
### Patch Changes

- Updated dependencies [de12b31]
- Updated dependencies [770954b]
  - @prosopo/types@4.9.4
  - @prosopo/types-database@4.11.6
  - @prosopo/user-access-policy@3.11.2

## 3.15.6
### Patch Changes

- Updated dependencies [18d0287]
  - @prosopo/types@4.9.3
  - @prosopo/types-database@4.11.5
  - @prosopo/user-access-policy@3.11.1

## 3.15.5
### Patch Changes

- Updated dependencies [ca78a0c]
  - @prosopo/user-access-policy@3.11.0
  - @prosopo/types-database@4.11.4

## 3.15.4
### Patch Changes

- Updated dependencies [7a434e0]
  - @prosopo/types@4.9.2
  - @prosopo/common@3.1.43
  - @prosopo/types-database@4.11.3
  - @prosopo/user-access-policy@3.10.11

## 3.15.3
### Patch Changes

- 3e0ef08: fix(provider): peek (read-only) at the escalation session before consuming on the origin → escalation fallback
  
  Follow-on to the route() escalation NO_SESSION_FOUND fix (#2771). When the widget hit `/captcha/pow` with the origin sessionId after a PoW-submit escalation to image/puzzle, `isValidRequest` resolved the Redis `origin → escalation` mapping and then immediately consumed the escalation session via `checkAndRemoveSession`. Because the escalation session's `captchaType` did not match the requested type, the handler returned `INCORRECT_CAPTCHA_TYPE` — and worse, the escalation session was already gone, so a widget that *did* know to switch to `/captcha/image` with the escalation sessionId from the PoW-submit envelope had nothing left to consume. Production rate jumped from ~4/hour on 3.6.47 to 58/hour on the single 3.6.49 node.
  
  The fix peeks the escalation session read-only first (`getSessionRecordBySessionId`) and only calls `checkAndRemoveSession` when `peeked.captchaType === requestedCaptchaType`. On mismatch the session is left intact, the Redis pointer is still dropped (single-use), and `INCORRECT_CAPTCHA_TYPE` is surfaced. Also extends `getSessionRecordBySessionId`'s projection to include `captchaType` (previously dropped, which would have made every peek look like a mismatch).
- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/types@4.9.1
  - @prosopo/types-database@4.11.2
  - @prosopo/util@3.3.3
  - @prosopo/common@3.1.42
  - @prosopo/user-access-policy@3.10.10
  - @prosopo/logger@2.0.1
  - @prosopo/redis-client@1.0.27

## 3.15.2
### Patch Changes

- ec363e9: fix(provider): resolve origin sessionId to escalation when post-PoW route() escalates to image/puzzle
  
  When the decision machine's route() phase escalates the user from PoW to an image/puzzle captcha, `buildEscalation` mints a fresh session — but the originating session has already been consumed by the preceding /captcha/pow request. Widgets that didn't switch to the escalation sessionId on the next /captcha/* call (older bundled SDKs, hand-rolled wrappers, network-retry races, tab races) landed on NO_SESSION_FOUND. Production deploy of R1/R2 escalations at 18:39 UTC caused a 4.6× spike in CAPTCHA.NO_SESSION_FOUND (363/hr → 1,668/hr); rate dropped immediately once the routing artifact was deleted.
  
  Records an origin → escalation sessionId mapping in Redis at the moment `buildEscalation` creates the new session. On the next /captcha/* request, `isValidRequest` falls back to that mapping when `checkAndRemoveSession` returns null for the supplied sessionId, then invalidates the mapping (single-use). When Redis is unavailable the escalation still returns to the client unchanged — those deployments accept the widget must handle the new sessionId on its own.

## 3.15.1
### Patch Changes

- 9fe3c06: make util fn for mongoose connection config, standardise mongoose connections
- 11f1e8c: Replace vague logger scopes (empty strings, import.meta.url, generic "CLI") with structured colon-delimited names following the convention package:subsystem:action.
- Updated dependencies [dfb0c53]
- Updated dependencies [7ebb78f]
- Updated dependencies [7daea2e]
- Updated dependencies [849af99]
- Updated dependencies [a5ba27b]
- Updated dependencies [948d36b]
- Updated dependencies [41e0e11]
- Updated dependencies [11f1e8c]
- Updated dependencies [3c80664]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
  - @prosopo/common@3.1.41
  - @prosopo/logger@2.0.0
  - @prosopo/user-access-policy@3.10.9
  - @prosopo/util@3.3.2
  - @prosopo/types@4.9.0
  - @prosopo/redis-client@1.0.26
  - @prosopo/types-database@4.11.1

## 3.15.0
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

- Updated dependencies [12cd0a6]
- Updated dependencies [12cd0a6]
  - @prosopo/types@4.8.0
  - @prosopo/types-database@4.11.0
  - @prosopo/user-access-policy@3.10.8

## 3.14.7
### Patch Changes

- bb98af1: Add `DecisionMachineKind` (`routing` | `decision`) to separate routing and decision artifacts on the same provider.
  
  - New `DecisionMachineKind` enum in `@prosopo/types`.
  - `DecisionMachineArtifact` and the Mongoose `DecisionMachineArtifactRecordSchema` gain an optional `kind` field; the unique compound index becomes `(scope, dappAccount, kind)` so a routing machine and a decision machine can coexist for the same scope/dapp.
  - `ProviderApi.updateDecisionMachine` accepts an optional `kind` 10th arg; the `apiUpdateDecisionMachineEndpoint` admin handler reads `decisionMachineKind` from the request body and forwards it.
  - `ClientTaskManager.updateDecisionMachine` and the artifact-listing returns include `kind`.
  - `ProviderDatabase.getDecisionMachineArtifact` filters by `kind` when supplied; `upsertDecisionMachineArtifact` defaults missing `kind` to `Routing` for backward compatibility on existing rows.
  - `DecisionMachineRunner` keys its in-memory cache by `(scope, kind, dappAccount)` and selects the appropriate artifact for `runDecisionMachine` (kind=`decision`), `runRoutingMachine` (kind=`routing`) and `runCounterMachine` (kind=`routing`).
  - `DecisionMachineArtifactRecordSchema.captchaType` enum now includes `CaptchaType.puzzle` alongside `pow`/`image`.
- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4
  - @prosopo/types-database@4.10.7
  - @prosopo/user-access-policy@3.10.7

## 3.14.6
### Patch Changes

- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/types-database@4.10.6
  - @prosopo/user-access-policy@3.10.6

## 3.14.5
### Patch Changes

- edcd450: Validate salt-encoded coords in PoW and puzzle verification and add a `CAPTCHA_INVALID_SALT` result reason. Invalid input now produces a disapproval rather than a partial write.
- Updated dependencies [e89860e]
- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/user-access-policy@3.10.5
  - @prosopo/util@3.3.1
  - @prosopo/types@4.7.2
  - @prosopo/types-database@4.10.5
  - @prosopo/logger@1.0.4
  - @prosopo/common@3.1.40
  - @prosopo/redis-client@1.0.25

## 3.14.4
### Patch Changes

- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1
  - @prosopo/types-database@4.10.4
  - @prosopo/user-access-policy@3.10.4

## 3.14.3
### Patch Changes

- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0
  - @prosopo/types-database@4.10.3
  - @prosopo/user-access-policy@3.10.3

## 3.14.2
### Patch Changes

- 4626340: perf(provider): cut p95 on /captcha/frictionless and /captcha/image
  
  Replaces the `$match → $sample` random-captcha lookup with an indexed
  range scan over a new `{datasetId, solved, randomKey}` compound index;
  reorders the `sampleContextEntropy` aggregation so `$sample` runs
  before `$lookup`; batches three pairs of independent awaits in the
  frictionless handler via `Promise.all`. Adds an integration test
  asserting via `.explain()` and wall-clock timing that the new paths
  are quantifiably faster. The legacy aggregation remains as a fallback
  in `getRandomCaptcha` so deployment can precede the
  providerBackfillCaptchaRandomKey rollout.
- 5f47c42: fix(database): widen `getSessionRecordBySessionId` projection so post-PoW routing escalations stop failing with `DATABASE.SESSION_STORE_FAILED`. The projection added in #2393 dropped `token`, `score`, `threshold`, `providerSelectEntropy`, `ipAddress`, etc., which `buildEscalation` forwards into a new session via `frictionlessManager.createSession`. With routing machines enabled for edge (2026-06-16) every escalation 500'd. Headers are now enumerated key-by-key so `headers.x-tls-clienthello` (multi-KB TLS ClientHello) stays out of the read.
- Updated dependencies [4626340]
- Updated dependencies [6962179]
  - @prosopo/types@4.6.1
  - @prosopo/types-database@4.10.2
  - @prosopo/user-access-policy@3.10.2

## 3.14.1
### Patch Changes

- 44eaebf: Fix `providedIp.lower` being persisted as BSON `Long` instead of `Decimal128` on `usercommitments`, which aborted the central-streaming sweep on a `CastError` and stopped *all* records from being streamed off the affected provider node.
  
  Three changes, each addressing one half of the regression introduced by #2681 ("lifecycle timestamps + submit→verify recency window"):
  
  - **provider.ts** — `updateDappUserCommitment` and `updatePuzzleCaptchaRecord` now branch between pipeline-form (`updateOne(filter, [{ $set: ... }])`) and ordinary `$set`. The pipeline form bypasses Mongoose schema casting, so a `bigint` IP half lands on disk as BSON Int64 (Long) rather than going through the `bigint → string → Decimal128` setter on `CompositeIpAddressRecordSchemaObj`. The pipeline form is only used when an `$ifNull` is genuinely required; the `imgCaptchaTasks` side-update call site only carries `providedIp`/`metadata`, so it now takes the ordinary path and the setter runs.
  - **captcha.ts** — `CaptchaDatabase.saveCaptchas` normalises `ipAddress` / `providedIp` composite-IP halves on each lean doc before the `bulkWrite`. `Model.bulkWrite` skips setters, so a Long-typed `lower` (whose unsigned value exceeds `Number.MAX_SAFE_INTEGER` — every IPv6 lower with bit 63 set) hits the Decimal128 caster raw and the ordered bulkWrite aborts the entire batch. Normalisation converts the Long via `Long.fromBits(low, high, /*unsigned*/ true).toString() → Decimal128`, matching what the original schema setter would have produced.
  - **types-database/provider.ts** — `CompositeIpAddressRecordSchemaObj.lower/upper` setters extracted into a shared `normaliseIpHalf` that also handles BSON `Long`. Defensive cover for the `updateOne`/`save`/`create` paths the streamer uses (those *do* run setters); does not run under `bulkWrite`, which is why the captcha.ts normalisation is also needed.
  
  Long-class checks use duck-typed `_bsontype === "Long"` rather than `instanceof Long` to stay robust against hoisting differences between the top-level `bson` import and the copy the MongoDB driver uses for deserialisation.
  
  Regression test under `packages/database/src/tests/integration/providedIpPipelineCast.integration.test.ts` pins both halves: ordinary `$set` writes Decimal128, `saveCaptchas` drains a Long-poisoned lean doc through to a clean Decimal128 at central, and a negative-control test keeps the underlying Mongoose pipeline-cast behaviour visible so a future regression on either side is unambiguous.
- Updated dependencies [55b1388]
- Updated dependencies [44eaebf]
  - @prosopo/util@3.3.0
  - @prosopo/types@4.6.0
  - @prosopo/types-database@4.10.1
  - @prosopo/logger@1.0.3
  - @prosopo/user-access-policy@3.10.1
  - @prosopo/common@3.1.39
  - @prosopo/redis-client@1.0.24

## 3.14.0
### Minor Changes

- 9b91e85: Log + persist access-policy block decisions. When `blockMiddleware` 401s a request, the inspector now emits a structured `"Access policy block"` log line carrying the matched rule's identity (`ruleHash`, `ruleType`, `ruleDescription`, `policyType`) and the request's user-scope (ja4 / ip / userAgent / userId / countryCode / asn), and writes a synthetic `Session` record with `blocked: true`, `deleted: true`, `reason: ACCESS_POLICY_BLOCK`, and the same rule fields surfaced on three new optional columns (`ruleHash`, `ruleType`, `ruleDescription`). Persistence is fire-and-forget and any Mongo failure is swallowed-and-logged so the 401 response is never delayed. The new fields are gated by `blocked: true` so legit sessions stay untouched, and two sparse indexes (`{siteKey, blocked, createdAt}`, `{ruleHash}`) keep the per-rule and per-client block aggregations the Traffic page will query off the existing sessions collection without bloating the index on normal traffic.

### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c1c7998]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0
  - @prosopo/types-database@4.10.0
  - @prosopo/user-access-policy@3.10.0

## 3.13.12
### Patch Changes

- Updated dependencies [b520cd9]
  - @prosopo/user-access-policy@3.9.1
  - @prosopo/types-database@4.9.2

## 3.13.11
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
- Updated dependencies [70ef67a]
- Updated dependencies [4da8941]
- Updated dependencies [f69724f]
- Updated dependencies [4226c59]
- Updated dependencies [3973078]
  - @prosopo/user-access-policy@3.9.0
  - @prosopo/types@4.4.1
  - @prosopo/types-database@4.9.1

## 3.13.10
### Patch Changes

- Updated dependencies [2972def]
- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types-database@4.9.0
  - @prosopo/types@4.4.0
  - @prosopo/user-access-policy@3.8.1

## 3.13.9
### Patch Changes

- Updated dependencies [2f459ce]
  - @prosopo/user-access-policy@3.8.0
  - @prosopo/types-database@4.8.2

## 3.13.8
### Patch Changes

- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/types-database@4.8.1
  - @prosopo/user-access-policy@3.7.12

## 3.13.7
### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [97cf7bd]
- Updated dependencies [6ca1125]
- Updated dependencies [32a591b]
  - @prosopo/types@4.3.0
  - @prosopo/types-database@4.8.0
  - @prosopo/logger@1.0.2
  - @prosopo/util@3.2.15
  - @prosopo/common@3.1.38
  - @prosopo/user-access-policy@3.7.11
  - @prosopo/redis-client@1.0.23

## 3.13.6
### Patch Changes

- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/types-database@4.7.8
  - @prosopo/user-access-policy@3.7.10

## 3.13.5
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.
- Updated dependencies [0fd81af]
  - @prosopo/common@3.1.37
  - @prosopo/logger@1.0.1
  - @prosopo/redis-client@1.0.22
  - @prosopo/types-database@4.7.7
  - @prosopo/user-access-policy@3.7.9

## 3.13.4
### Patch Changes

- b2e1a5d: fix(database/provider): don't flag image-captcha placeholder records as `pendingStage`
  
  #2596 set `pendingStage: true` on every commitment write, including
  `storePendingImageCommitment` which inserts placeholder records with
  `id: ""` while waiting for the user to submit a solution. The sweep
  then picked those up via `pendingStage_partial` (fast) and called
  `markDappUserCommitmentsStored(["", "", ...], ts)` (slow) — Mongo
  dedupes the `$in` array to a single empty-string bound and the
  `IXSCAN { id: -1 }` walks every empty-id document on the node (~102K
  on production). On pronode11 that meant 2–8 s per sweep cycle of
  unnecessary index scan on `usercommitments`, replacing the old
  WT-cache-thrash with a different one.
  
  Two-part fix:
  
  - `storePendingImageCommitment` no longer sets `pendingStage`. The
    real commitment record only gets the flag once `approve` /
    `disapprove` runs, at which point `id` is populated and staging is
    meaningful.
  - `storeCommitmentsExternal` defensively skips any batch entry whose
    `id` is empty before calling `markDappUserCommitmentsStored`, so a
    stray placeholder slipping into the partial index can never
    re-introduce the bug.
  
  For nodes already running #2596, the existing flagged placeholders
  need clearing once (otherwise they sit at `pendingStage: true`
  forever, since `markDappUserCommitmentsStored`'s
  `lastUpdatedTimestamp <= ts` guard never matches them after their
  last update). One-shot per node:
  
  ```js
  db.usercommitments.updateMany(
    { pendingStage: true, id: "" },
    { $unset: { pendingStage: 1 } }
  );
  ```
- Updated dependencies [cdbc5ed]
- Updated dependencies [4d9923e]
- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types-database@4.7.6
  - @prosopo/types@4.2.0
  - @prosopo/user-access-policy@3.7.8

## 3.13.3
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
- Updated dependencies [d351362]
  - @prosopo/types@4.1.4
  - @prosopo/types-database@4.7.5
  - @prosopo/user-access-policy@3.7.7

## 3.13.2
### Patch Changes

- Updated dependencies [6567ce0]
- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
- Updated dependencies [7e8cbb7]
  - @prosopo/util@3.2.14
  - @prosopo/types@4.1.3
  - @prosopo/types-database@4.7.4
  - @prosopo/user-access-policy@3.7.6
  - @prosopo/common@3.1.36
  - @prosopo/redis-client@1.0.21

## 3.13.1
### Patch Changes

- Updated dependencies [72a1218]
  - @prosopo/util@3.2.13
  - @prosopo/types@4.1.2
  - @prosopo/user-access-policy@3.7.5
  - @prosopo/types-database@4.7.3

## 3.13.0
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

- Updated dependencies [91958da]
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35
  - @prosopo/types-database@4.7.2
  - @prosopo/user-access-policy@3.7.4
  - @prosopo/redis-client@1.0.20

## 3.12.1
### Patch Changes

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
- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/types-database@4.7.1
  - @prosopo/user-access-policy@3.7.3

## 3.12.0
### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.

### Patch Changes

- f9ea09d: Stop re-looking up the IP in `checkTrafficFilter` — read `record.ipInfo` instead
  
  Now that every captcha record carries the full `IPInfoResponse` (written by `ipInfoMiddleware` at request time), `checkTrafficFilter` no longer needs to call `ipInfoService.lookup(ip)` on the verify path. The function takes an `IPInfoResponse | undefined` directly and is no longer async — one fewer sidecar round-trip per verify call.
  
  - `checkTrafficFilter(ip, trafficFilter, ipInfoService, logger)` → `checkTrafficFilter(ipInfo, trafficFilter)`.
  - `serverVerifyPowCaptchaSolution`, `verifyImageCaptchaSolution`, and `serverVerifyPuzzleCaptchaSolution` (newly given a `trafficFilter` parameter to bring it to parity with the other two) read `challengeRecord.ipInfo` / `solution.ipInfo` by default, and only do a fresh `env.ipInfoService.lookup(ip)` when the dapp passed up the end user's current IP via the verify call — that's the "now" IP for filtering, and may differ from the IP that originally requested the captcha.
  - Existing unit tests (`checkTrafficFilter.unit.test.ts`) updated to the new shape; new MongoMemory roundtrip tests in `packages/database/src/tests/integration/ipInfoPersistence.integration.test.ts` prove the three captcha schemas (PoW / Puzzle / UserCommitment) actually persist + retrieve a full IPInfoResponse, and that the `{ ipInfo: { $exists: false } }` backfill query matches records missing the field.
  
  Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
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
- Updated dependencies [72a0483]
  - @prosopo/types@4.0.0
  - @prosopo/types-database@4.7.0
  - @prosopo/locale@3.2.2
  - @prosopo/util@3.2.12
  - @prosopo/common@3.1.34
  - @prosopo/user-access-policy@3.7.2
  - @prosopo/redis-client@1.0.19

## 3.11.0
### Minor Changes

- 33a6c57: Provider speed ups

### Patch Changes

- Updated dependencies [819ed95]
  - @prosopo/types-database@4.6.2
  - @prosopo/types@3.16.1
  - @prosopo/user-access-policy@3.7.1

## 3.10.2
### Patch Changes

- Updated dependencies [60ba3b1]
  - @prosopo/user-access-policy@3.7.0
  - @prosopo/types-database@4.6.1

## 3.10.1
### Patch Changes

- 942701b: Connection drop fix

## 3.10.0
### Minor Changes

- 74092d0: Stream data back to central for decisions

### Patch Changes

- Updated dependencies [74092d0]
  - @prosopo/types-database@4.6.0

## 3.9.18
### Patch Changes

- f6a4402: API endpoint for removing site keys
- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types-database@4.5.3
  - @prosopo/types@3.16.0
  - @prosopo/user-access-policy@3.6.24

## 3.9.17
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0
  - @prosopo/types-database@4.5.2
  - @prosopo/user-access-policy@3.6.23

## 3.9.16
### Patch Changes

- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
- Updated dependencies [b94890c]
  - @prosopo/types-database@4.5.1
  - @prosopo/types@3.14.1
  - @prosopo/locale@3.2.1
  - @prosopo/common@3.1.33
  - @prosopo/user-access-policy@3.6.22
  - @prosopo/redis-client@1.0.18

## 3.9.15
### Patch Changes

- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/types-database@4.5.0
  - @prosopo/locale@3.2.0
  - @prosopo/types@3.14.0
  - @prosopo/common@3.1.32
  - @prosopo/user-access-policy@3.6.21
  - @prosopo/redis-client@1.0.17

## 3.9.14
### Patch Changes

- Updated dependencies [4a9c518]
  - @prosopo/common@3.1.31
  - @prosopo/redis-client@1.0.16
  - @prosopo/types-database@4.4.14
  - @prosopo/user-access-policy@3.6.20

## 3.9.13
### Patch Changes

- Updated dependencies [a25dffa]
  - @prosopo/util@3.2.11
  - @prosopo/types@3.13.3
  - @prosopo/user-access-policy@3.6.19
  - @prosopo/types-database@4.4.13

## 3.9.12
### Patch Changes

- Updated dependencies [346edd7]
  - @prosopo/util@3.2.10
  - @prosopo/types@3.13.2
  - @prosopo/user-access-policy@3.6.18
  - @prosopo/types-database@4.4.12

## 3.9.11
### Patch Changes

- Updated dependencies [22bfee7]
  - @prosopo/util@3.2.9
  - @prosopo/types@3.13.1
  - @prosopo/user-access-policy@3.6.17
  - @prosopo/types-database@4.4.11

## 3.9.10
### Patch Changes

- Updated dependencies [e0fb3d6]
- Updated dependencies [e6d9553]
- Updated dependencies [f3f23e3]
  - @prosopo/util@3.2.8
  - @prosopo/types@3.13.0
  - @prosopo/user-access-policy@3.6.16
  - @prosopo/types-database@4.4.10

## 3.9.9
### Patch Changes

- e1ea65f: Better spam email domain checking
- c316257: Adding sync fo sessions wrt captcha status
- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/types@3.12.3
  - @prosopo/types-database@4.4.9
  - @prosopo/util@3.2.7
  - @prosopo/user-access-policy@3.6.15

## 3.9.8
### Patch Changes

- adb89a6: Disposable email checking
- Updated dependencies [adb89a6]
  - @prosopo/types-database@4.4.8
  - @prosopo/locale@3.1.29
  - @prosopo/types@3.12.2
  - @prosopo/common@3.1.30
  - @prosopo/user-access-policy@3.6.14
  - @prosopo/redis-client@1.0.15

## 3.9.7
### Patch Changes

- Updated dependencies [c5ee492]
- Updated dependencies [a90eb54]
  - @prosopo/common@3.1.29
  - @prosopo/types-database@4.4.7
  - @prosopo/types@3.12.1
  - @prosopo/redis-client@1.0.14
  - @prosopo/user-access-policy@3.6.13

## 3.9.6
### Patch Changes

- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/types@3.12.0
  - @prosopo/types-database@4.4.6
  - @prosopo/user-access-policy@3.6.12

## 3.9.5
### Patch Changes

- Updated dependencies [8148587]
  - @prosopo/types-database@4.4.5
  - @prosopo/types@3.11.1
  - @prosopo/user-access-policy@3.6.11

## 3.9.4
### Patch Changes

- Updated dependencies [90033e9]
  - @prosopo/types-database@4.4.4

## 3.9.3
### Patch Changes

- Updated dependencies [7f6ffc5]
  - @prosopo/types@3.11.0
  - @prosopo/types-database@4.4.3
  - @prosopo/user-access-policy@3.6.10

## 3.9.2
### Patch Changes

- 93fa086: Add decision engine endpoints
- Updated dependencies [93fa086]
  - @prosopo/types-database@4.4.2
  - @prosopo/types@3.10.2
  - @prosopo/user-access-policy@3.6.9

## 3.9.1
### Patch Changes

- Updated dependencies [cde7550]
  - @prosopo/types-database@4.4.1
  - @prosopo/types@3.10.1
  - @prosopo/user-access-policy@3.6.8

## 3.9.0
### Minor Changes

- ad6d622: Separate types from mongoose schemas to avoid bundling mongoose in frontend

### Patch Changes

- ced9f41: Fix incorrect projection
- fa95c5f: zod types for db records
- Updated dependencies [ad6d622]
- Updated dependencies [fa95c5f]
  - @prosopo/types-database@4.4.0
  - @prosopo/types@3.10.0
  - @prosopo/user-access-policy@3.6.7

## 3.8.0
### Minor Changes

- d329e63: Use projections to speed up queries

### Patch Changes

- Updated dependencies [ff58a70]
  - @prosopo/types@3.9.0
  - @prosopo/types-database@4.3.1
  - @prosopo/user-access-policy@3.6.6

## 3.7.0
### Minor Changes

- 3feeea4: Store geolocation. Remove pending image captcha collection

### Patch Changes

- Updated dependencies [3feeea4]
  - @prosopo/types-database@4.3.0

## 3.6.12
### Patch Changes

- Updated dependencies [4c08158]
- Updated dependencies [d2431cd]
  - @prosopo/types-database@4.2.4
  - @prosopo/types@3.8.4
  - @prosopo/user-access-policy@3.6.5

## 3.6.11
### Patch Changes

- Updated dependencies [8dad7f3]
  - @prosopo/types-database@4.2.3

## 3.6.10
### Patch Changes

- Updated dependencies [bd6995b]
  - @prosopo/user-access-policy@3.6.4
  - @prosopo/types@3.8.3
  - @prosopo/types-database@4.2.2

## 3.6.9
### Patch Changes

- Updated dependencies [9633e58]
  - @prosopo/types-database@4.2.1
  - @prosopo/types@3.8.2
  - @prosopo/user-access-policy@3.6.3

## 3.6.8
### Patch Changes

- f52a5c1: Adding decision machine to provider for behavior detection
- Updated dependencies [f52a5c1]
- Updated dependencies [4299cae]
  - @prosopo/types-database@4.2.0
  - @prosopo/types@3.8.1
  - @prosopo/user-access-policy@3.6.2

## 3.6.7
### Patch Changes

- Updated dependencies [ed87b6f]
  - @prosopo/user-access-policy@3.6.1
  - @prosopo/types-database@4.1.6

## 3.6.6
### Patch Changes

- 3acc333: Update pow record at verify
- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 3acc333: Release 3.3.0
- Updated dependencies [3acc333]
- Updated dependencies [3acc333]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [17854a7]
- Updated dependencies [7543d17]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/types-database@4.1.5
  - @prosopo/types@3.8.0
  - @prosopo/user-access-policy@3.6.0
  - @prosopo/redis-client@1.0.13
  - @prosopo/common@3.1.28
  - @prosopo/locale@3.1.28

## 3.6.5
### Patch Changes

- Updated dependencies [378a896]
- Updated dependencies [90fddd8]
  - @prosopo/user-access-policy@3.5.37
  - @prosopo/types-database@4.1.4

## 3.6.4
### Patch Changes

- Updated dependencies [7c475dc]
  - @prosopo/user-access-policy@3.5.36
  - @prosopo/types-database@4.1.3

## 3.6.3
### Patch Changes

- 9ab5f11: Remove ts-ignore for package bump

## 3.6.2
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/types-database@4.1.2
  - @prosopo/user-access-policy@3.5.35

## 3.6.1
### Patch Changes

- 345b25b: pow coord
- Updated dependencies [345b25b]
  - @prosopo/types-database@4.1.1
  - @prosopo/types@3.7.1
  - @prosopo/user-access-policy@3.5.34

## 3.6.0
### Minor Changes

- ce70a2b: Add context-aware entropy calculation for WebView and default contexts
  
  - Added ContextType enum to distinguish between WebView and default browser contexts
  - Implemented context-specific entropy calculation and storage
  - Created clientContextEntropy collection with automatic timestamp management
  - Removed legacy clientEntropy table in favor of context-specific approach
  - Added helper functions for context determination and threshold retrieval
  - Included comprehensive unit tests for context validation logic

### Patch Changes

- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
- Updated dependencies [e01227b]
  - @prosopo/types@3.7.0
  - @prosopo/types-database@4.1.0
  - @prosopo/locale@3.1.27
  - @prosopo/common@3.1.27
  - @prosopo/user-access-policy@3.5.33
  - @prosopo/redis-client@1.0.12

## 3.5.6
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/common@3.1.26
  - @prosopo/locale@3.1.26
  - @prosopo/redis-client@1.0.11
  - @prosopo/types@3.6.4
  - @prosopo/types-database@4.0.6
  - @prosopo/user-access-policy@3.5.32

## 3.5.5
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/common@3.1.25
  - @prosopo/locale@3.1.25
  - @prosopo/redis-client@1.0.10
  - @prosopo/types@3.6.3
  - @prosopo/types-database@4.0.5
  - @prosopo/user-access-policy@3.5.31

## 3.5.4
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/user-access-policy@3.5.30
  - @prosopo/types-database@4.0.4
  - @prosopo/redis-client@1.0.9
  - @prosopo/common@3.1.24
  - @prosopo/locale@3.1.24
  - @prosopo/types@3.6.2

## 3.5.3
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/common@3.1.23
  - @prosopo/locale@3.1.23
  - @prosopo/redis-client@1.0.8
  - @prosopo/types@3.6.1
  - @prosopo/types-database@4.0.3
  - @prosopo/user-access-policy@3.5.29

## 3.5.2
### Patch Changes

- Updated dependencies [0a9887c]
  - @prosopo/types-database@4.0.2

## 3.5.1
### Patch Changes

- Updated dependencies [3e5d80a]
  - @prosopo/types-database@4.0.1

## 3.5.0
### Minor Changes

- bb5f41c: Context awareness

### Patch Changes

- 55a64c6: stop refresh image to pow
- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- 55a64c6: Persist sessions for user ip combinations
- Updated dependencies [8ce9205]
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [55a64c6]
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [8f22479]
- Updated dependencies [b6e98b2]
- Updated dependencies [55a64c6]
  - @prosopo/user-access-policy@3.5.28
  - @prosopo/types@3.6.0
  - @prosopo/types-database@4.0.0
  - @prosopo/redis-client@1.0.7
  - @prosopo/common@3.1.22
  - @prosopo/locale@3.1.22
  - @prosopo/config@3.1.22

## 3.4.13
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/types-database@3.3.13
  - @prosopo/user-access-policy@3.5.27

## 3.4.12
### Patch Changes

- Updated dependencies [cb8ab85]
  - @prosopo/types-database@3.3.12
  - @prosopo/types@3.5.10
  - @prosopo/user-access-policy@3.5.26

## 3.4.11
### Patch Changes

- 43907e8: Convert timestamp fields from numbers to Date objects throughout codebase
- b4639ec: Merge frictionless tokens into sessions
- Updated dependencies [43907e8]
- Updated dependencies [b4639ec]
- Updated dependencies [005ce66]
- Updated dependencies [7101036]
  - @prosopo/types-database@3.3.11
  - @prosopo/types@3.5.9
  - @prosopo/user-access-policy@3.5.25

## 3.4.10
### Patch Changes

- Updated dependencies [b10a65f]
- Updated dependencies [e5c259d]
- Updated dependencies [6420187]
  - @prosopo/types-database@3.3.10
  - @prosopo/types@3.5.8
  - @prosopo/user-access-policy@3.5.24

## 3.4.9
### Patch Changes

- b8185a4: feat/uap-rules-syncer
- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
- Updated dependencies [3a027ef]
- Updated dependencies [3a027ef]
  - @prosopo/user-access-policy@3.5.23
  - @prosopo/common@3.1.21
  - @prosopo/config@3.1.21
  - @prosopo/types-database@3.3.9
  - @prosopo/redis-client@1.0.6
  - @prosopo/locale@3.1.21
  - @prosopo/types@3.5.7

## 3.4.8
### Patch Changes

- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/types-database@3.3.8
  - @prosopo/user-access-policy@3.5.22

## 3.4.7
### Patch Changes

- Updated dependencies [494c5a8]
  - @prosopo/types-database@3.3.7
  - @prosopo/types@3.5.5
  - @prosopo/user-access-policy@3.5.21

## 3.4.6
### Patch Changes

- Updated dependencies [08ff50f]
- Updated dependencies [08ff50f]
  - @prosopo/types-database@3.3.6
  - @prosopo/types@3.5.4
  - @prosopo/user-access-policy@3.5.20

## 3.4.5
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/common@3.1.20
  - @prosopo/locale@3.1.20
  - @prosopo/redis-client@1.0.5
  - @prosopo/types@3.5.3
  - @prosopo/types-database@3.3.5
  - @prosopo/user-access-policy@3.5.19

## 3.4.4
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/user-access-policy@3.5.18
  - @prosopo/types-database@3.3.4
  - @prosopo/redis-client@1.0.4
  - @prosopo/locale@3.1.19
  - @prosopo/types@3.5.2
  - @prosopo/config@3.1.19

## 3.4.3
### Patch Changes

- c72ecbd: Reduce noisy logs
- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/user-access-policy@3.5.17
  - @prosopo/types-database@3.3.3
  - @prosopo/redis-client@1.0.3
  - @prosopo/common@3.1.18
  - @prosopo/locale@3.1.18
  - @prosopo/config@3.1.18

## 3.4.2
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/user-access-policy@3.5.16
  - @prosopo/types-database@3.3.2
  - @prosopo/redis-client@1.0.2
  - @prosopo/common@3.1.17
  - @prosopo/locale@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/config@3.1.17

## 3.4.1
### Patch Changes

- 11303d9: feat/pluggable-redis
- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [b6794f8]
- Updated dependencies [11303d9]
- Updated dependencies [bac2d91]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/user-access-policy@3.5.15
  - @prosopo/redis-client@1.0.1
  - @prosopo/types-database@3.3.1
  - @prosopo/common@3.1.16
  - @prosopo/locale@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/config@3.1.16

## 3.4.0
### Minor Changes

- 6768f14: Update salt

### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/user-access-policy@3.5.14
  - @prosopo/types-database@3.3.0
  - @prosopo/common@3.1.15
  - @prosopo/locale@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/config@3.1.15

## 3.3.2
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/user-access-policy@3.5.13
  - @prosopo/types-database@3.2.2
  - @prosopo/common@3.1.14
  - @prosopo/locale@3.1.14
  - @prosopo/config@3.1.14

## 3.3.1
### Patch Changes

- 5137f01: Update pow record at verify
- 008d112: Release 3.3.0
- Updated dependencies [5137f01]
- Updated dependencies [0555cd8]
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types-database@3.2.1
  - @prosopo/types@3.2.1
  - @prosopo/user-access-policy@3.5.12
  - @prosopo/common@3.1.13
  - @prosopo/locale@3.1.13
  - @prosopo/config@3.1.13

## 3.3.0
### Minor Changes

- cf48565: Store additional details. Remove duplicate indexes.
- 260de39: Fix indexes so that stuff properly expires

### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [d644c04]
- Updated dependencies [0824221]
- Updated dependencies [260de39]
  - @prosopo/types-database@3.2.0
  - @prosopo/types@3.2.0
  - @prosopo/user-access-policy@3.5.11
  - @prosopo/common@3.1.12
  - @prosopo/locale@3.1.12
  - @prosopo/config@3.1.12

## 3.2.4
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/types-database@3.1.5
  - @prosopo/locale@3.1.11
  - @prosopo/types@3.1.4
  - @prosopo/user-access-policy@3.5.10
  - @prosopo/common@3.1.11
  - @prosopo/config@3.1.11

## 3.2.3
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [a8a9251]
- Updated dependencies [657a827]
  - @prosopo/types-database@3.1.4
  - @prosopo/user-access-policy@3.5.9
  - @prosopo/common@3.1.10
  - @prosopo/locale@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/config@3.1.10

## 3.2.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- 1249ce0: Be more lenient with random provider selection
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/user-access-policy@3.5.8
  - @prosopo/types-database@3.1.3
  - @prosopo/common@3.1.9
  - @prosopo/locale@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/config@3.1.9

## 3.2.1
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/types@3.1.1
  - @prosopo/user-access-policy@3.5.7
  - @prosopo/types-database@3.1.2
  - @prosopo/common@3.1.8
  - @prosopo/locale@3.1.8
  - @prosopo/config@3.1.8

## 3.2.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/user-access-policy@3.5.6
  - @prosopo/types-database@3.1.1
  - @prosopo/common@3.1.7
  - @prosopo/locale@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/config@3.1.7

## 3.1.0
### Minor Changes

- 9b92339: fix/ipv6-in-captcha-flow

### Patch Changes

- a07db04: Release 3.1.12
- Updated dependencies [9b92339]
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
  - @prosopo/types-database@3.1.0
  - @prosopo/config@3.1.6
  - @prosopo/user-access-policy@3.5.5
  - @prosopo/common@3.1.6
  - @prosopo/locale@3.1.6
  - @prosopo/types@3.0.10

## 3.0.19
### Patch Changes

- e64160c: The way mongo memory server works has changed
- Updated dependencies [553025d]
  - @prosopo/user-access-policy@3.5.4
  - @prosopo/types-database@3.0.19

## 3.0.18
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/types-database@3.0.18
  - @prosopo/locale@3.1.5
  - @prosopo/user-access-policy@3.5.3
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9

## 3.0.17
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/common@3.1.4
  - @prosopo/types@3.0.8
  - @prosopo/types-database@3.0.17
  - @prosopo/user-access-policy@3.5.2

## 3.0.16
### Patch Changes

- 1f3a02f: Release 3.1.8
- Updated dependencies [1f3a02f]
  - @prosopo/user-access-policy@3.5.1
  - @prosopo/types-database@3.0.16

## 3.0.15
### Patch Changes

- Updated dependencies [e0628d9]
  - @prosopo/user-access-policy@3.5.0
  - @prosopo/types-database@3.0.15

## 3.0.14
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
- Updated dependencies [e090e2f]
  - @prosopo/config@3.1.4
  - @prosopo/user-access-policy@3.4.1
  - @prosopo/common@3.1.3
  - @prosopo/types@3.0.7
  - @prosopo/types-database@3.0.14

## 3.0.13
### Patch Changes

- 828066d: remove empty test npm scripts, add missing npm test scripts
- df4e030: Revising UAP rule getters
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
  - @prosopo/types-database@3.0.13
  - @prosopo/common@3.1.2
  - @prosopo/types@3.0.6
  - @prosopo/config@3.1.3
  - @prosopo/user-access-policy@3.4.0

## 3.0.12
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/user-access-policy@3.3.2
  - @prosopo/types-database@3.0.12
  - @prosopo/common@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/config@3.1.2

## 3.0.11
### Patch Changes

- 625fef8: ua parsing
- Updated dependencies [625fef8]
  - @prosopo/types-database@3.0.11

## 3.0.10
### Patch Changes

- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 3573f0b: standardise all vite based npm scripts for bundling
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
  - @prosopo/types@3.0.4
  - @prosopo/user-access-policy@3.3.1
  - @prosopo/types-database@3.0.10
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.0.9
### Patch Changes

- Updated dependencies [b7c3258]
  - @prosopo/user-access-policy@3.3.0
  - @prosopo/types-database@3.0.9

## 3.0.8
### Patch Changes

- Updated dependencies [cdf7c29]
  - @prosopo/user-access-policy@3.2.1
  - @prosopo/types-database@3.0.8

## 3.0.7
### Patch Changes

- Updated dependencies [a7164ce]
  - @prosopo/user-access-policy@3.2.0
  - @prosopo/types-database@3.0.7

## 3.0.6
### Patch Changes

- b0d7207: Types for proper rotation
- Updated dependencies [b0d7207]
  - @prosopo/types-database@3.0.6
  - @prosopo/types@3.0.3
  - @prosopo/user-access-policy@3.1.5

## 3.0.5
### Patch Changes

- Updated dependencies [745cc89]
  - @prosopo/config@3.1.0
  - @prosopo/types-database@3.0.5
  - @prosopo/user-access-policy@3.1.4

## 3.0.4
### Patch Changes

- Updated dependencies [5619b4b]
  - @prosopo/config@3.0.1
  - @prosopo/types-database@3.0.4
  - @prosopo/user-access-policy@3.1.3

## 3.0.3
### Patch Changes

- f682f0c: Moving type and fixing i18n config
- Updated dependencies [f682f0c]
  - @prosopo/types-database@3.0.3
  - @prosopo/types@3.0.2
  - @prosopo/common@3.0.2
  - @prosopo/user-access-policy@3.1.2

## 3.0.2
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/types-database@3.0.2
  - @prosopo/user-access-policy@3.1.1

## 3.0.1
### Patch Changes

- Updated dependencies [913f2a6]
  - @prosopo/user-access-policy@3.1.0
  - @prosopo/types-database@3.0.1

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/user-access-policy@3.0.0
  - @prosopo/types-database@3.0.0
  - @prosopo/common@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/config@3.0.0

## 2.6.9
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0
  - @prosopo/types-database@2.7.6
  - @prosopo/user-access-policy@2.6.8

## 2.6.8
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/user-access-policy@2.6.7
  - @prosopo/types-database@2.7.5
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1
  - @prosopo/config@2.6.1

## 2.6.7
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/types@2.9.0
  - @prosopo/common@2.7.1
  - @prosopo/types-database@2.7.4
  - @prosopo/user-access-policy@2.6.6

## 2.6.6
### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/types-database@2.7.3
  - @prosopo/user-access-policy@2.6.5

## 2.6.5

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/types@2.7.1
  - @prosopo/types-database@2.7.2
  - @prosopo/user-access-policy@2.6.4

## 2.6.4

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0
  - @prosopo/types-database@2.7.1
  - @prosopo/user-access-policy@2.6.3

## 2.6.3

### Patch Changes

- Updated dependencies [cf59998]
  - @prosopo/types-database@2.7.0

## 2.6.2

### Patch Changes

- Updated dependencies [6ff193a]
  - @prosopo/types@2.6.2
  - @prosopo/types-database@2.6.2
  - @prosopo/user-access-policy@2.6.2

## 2.6.1

### Patch Changes

- 52feffc: Adjustable difficulty img captcha
- Updated dependencies [52feffc]
  - @prosopo/types-database@2.6.1
  - @prosopo/types@2.6.1
  - @prosopo/user-access-policy@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/config@2.6.0
  - @prosopo/common@2.6.0
  - @prosopo/types@2.6.0
  - @prosopo/types-database@2.6.0
  - @prosopo/user-access-policy@2.6.0
