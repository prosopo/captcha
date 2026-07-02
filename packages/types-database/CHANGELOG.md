# @prosopo/types-database

## 4.11.5
### Patch Changes

- Updated dependencies [18d0287]
  - @prosopo/types@4.9.3
  - @prosopo/user-access-policy@3.11.1

## 4.11.4
### Patch Changes

- Updated dependencies [ca78a0c]
  - @prosopo/user-access-policy@3.11.0

## 4.11.3
### Patch Changes

- Updated dependencies [f9e8c94]
- Updated dependencies [7a434e0]
  - @prosopo/locale@3.2.6
  - @prosopo/types@4.9.2
  - @prosopo/common@3.1.43
  - @prosopo/user-access-policy@3.10.11

## 4.11.2
### Patch Changes

- 970bca2: feat(provider): record the page URL a frictionless session originated from and require it
  
  The frictionless client now reports the page it was rendered on (built from `window.location.origin + pathname`) in the challenge request, and the provider stores it on the session as `currentUrl`. The value is reduced to scheme + host + path on both the client and the provider (`sanitisePageUrl`): the query string, fragment and any embedded `user:pass@` credentials are stripped so URL-borne secrets (tokens, reset codes, session ids) are never persisted. A session whose request carries no usable page URL is treated as a bot signal and forced down the image-captcha path (`FrictionlessReason.MISSING_CURRENT_URL`).
- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/types@4.9.1
  - @prosopo/common@3.1.42
  - @prosopo/user-access-policy@3.10.10
  - @prosopo/logger@2.0.1

## 4.11.1
### Patch Changes

- Updated dependencies [dfb0c53]
- Updated dependencies [7ebb78f]
- Updated dependencies [7daea2e]
- Updated dependencies [948d36b]
- Updated dependencies [41e0e11]
- Updated dependencies [11f1e8c]
- Updated dependencies [3c80664]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
  - @prosopo/common@3.1.41
  - @prosopo/logger@2.0.0
  - @prosopo/user-access-policy@3.10.9
  - @prosopo/types@4.9.0

## 4.11.0
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
  - @prosopo/user-access-policy@3.10.8

## 4.10.7
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
  - @prosopo/user-access-policy@3.10.7

## 4.10.6
### Patch Changes

- 0f3750b: Add optional `entropyMathRandomFingerprint`, `entropyCryptoFingerprint`, `entropyWallClockOffsetMs` and `entropyMathRandomFirst` fields on `Session` (Zod + Mongoose) and the frictionless `decryptPayload` → `setSessionParams` → `createSession` chain. Sparse compound index `{ siteKey, entropyMathRandomFingerprint, createdAt: -1 }` for query support.
- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/user-access-policy@3.10.6

## 4.10.5
### Patch Changes

- 5295c4b: Traffic-filter `datacenterNameAllowlist` now matches `datacenterName`, `providerName`, or `asnOrganization` (was: `datacenterName` only). Lets the allowlist reach IPs where upstream sets `is_datacenter: true` without populating `datacenter.datacenter`.
  
  New opt-in `trafficFilter.skipExtrasOnValidDnsPath` (default `false`): when on and `dnsEvent.pathValid === true`, skip the filter evaluation on the DNS peer and resolver IPs.
- Updated dependencies [e89860e]
- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/user-access-policy@3.10.5
  - @prosopo/types@4.7.2
  - @prosopo/locale@3.2.5
  - @prosopo/logger@1.0.4
  - @prosopo/common@3.1.40

## 4.10.4
### Patch Changes

- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1
  - @prosopo/user-access-policy@3.10.4

## 4.10.3
### Patch Changes

- 3a46191: feat(traffic-filter): allowlist datacenter operators by name
  
  Apple's iCloud Private Relay exits from datacenter IPs, so sites with
  `blockDatacenter: true` were dropping legitimate Safari traffic. ipapi
  already reports the operator name verbatim in `datacenter.datacenter`
  — expose it on `IPInfoResult.datacenterName` and let `TrafficFilter`
  carry an optional `datacenterNameAllowlist` so operators can opt the
  relay traffic through without disabling the rest of the rule. Match
  is case-/whitespace-insensitive; the allowlist only suppresses the
  datacenter check, so a VPN/Tor/Proxy/Abuser hit on the same IP still
  blocks. New field is wired through Zod (capped 50 × 128 chars) and
  the Mongoose client settings schema so it persists.
- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0
  - @prosopo/user-access-policy@3.10.3

## 4.10.2
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
- Updated dependencies [4626340]
- Updated dependencies [6962179]
  - @prosopo/types@4.6.1
  - @prosopo/user-access-policy@3.10.2

## 4.10.1
### Patch Changes

- 44eaebf: Fix `providedIp.lower` being persisted as BSON `Long` instead of `Decimal128` on `usercommitments`, which aborted the central-streaming sweep on a `CastError` and stopped *all* records from being streamed off the affected provider node.
  
  Three changes, each addressing one half of the regression introduced by #2681 ("lifecycle timestamps + submit→verify recency window"):
  
  - **provider.ts** — `updateDappUserCommitment` and `updatePuzzleCaptchaRecord` now branch between pipeline-form (`updateOne(filter, [{ $set: ... }])`) and ordinary `$set`. The pipeline form bypasses Mongoose schema casting, so a `bigint` IP half lands on disk as BSON Int64 (Long) rather than going through the `bigint → string → Decimal128` setter on `CompositeIpAddressRecordSchemaObj`. The pipeline form is only used when an `$ifNull` is genuinely required; the `imgCaptchaTasks` side-update call site only carries `providedIp`/`metadata`, so it now takes the ordinary path and the setter runs.
  - **captcha.ts** — `CaptchaDatabase.saveCaptchas` normalises `ipAddress` / `providedIp` composite-IP halves on each lean doc before the `bulkWrite`. `Model.bulkWrite` skips setters, so a Long-typed `lower` (whose unsigned value exceeds `Number.MAX_SAFE_INTEGER` — every IPv6 lower with bit 63 set) hits the Decimal128 caster raw and the ordered bulkWrite aborts the entire batch. Normalisation converts the Long via `Long.fromBits(low, high, /*unsigned*/ true).toString() → Decimal128`, matching what the original schema setter would have produced.
  - **types-database/provider.ts** — `CompositeIpAddressRecordSchemaObj.lower/upper` setters extracted into a shared `normaliseIpHalf` that also handles BSON `Long`. Defensive cover for the `updateOne`/`save`/`create` paths the streamer uses (those *do* run setters); does not run under `bulkWrite`, which is why the captcha.ts normalisation is also needed.
  
  Long-class checks use duck-typed `_bsontype === "Long"` rather than `instanceof Long` to stay robust against hoisting differences between the top-level `bson` import and the copy the MongoDB driver uses for deserialisation.
  
  Regression test under `packages/database/src/tests/integration/providedIpPipelineCast.integration.test.ts` pins both halves: ordinary `$set` writes Decimal128, `saveCaptchas` drains a Long-poisoned lean doc through to a clean Decimal128 at central, and a negative-control test keeps the underlying Mongoose pipeline-cast behaviour visible so a future regression on either side is unambiguous.
- Updated dependencies [55b1388]
  - @prosopo/types@4.6.0
  - @prosopo/logger@1.0.3
  - @prosopo/user-access-policy@3.10.1
  - @prosopo/common@3.1.39

## 4.10.0
### Minor Changes

- 9b91e85: Log + persist access-policy block decisions. When `blockMiddleware` 401s a request, the inspector now emits a structured `"Access policy block"` log line carrying the matched rule's identity (`ruleHash`, `ruleType`, `ruleDescription`, `policyType`) and the request's user-scope (ja4 / ip / userAgent / userId / countryCode / asn), and writes a synthetic `Session` record with `blocked: true`, `deleted: true`, `reason: ACCESS_POLICY_BLOCK`, and the same rule fields surfaced on three new optional columns (`ruleHash`, `ruleType`, `ruleDescription`). Persistence is fire-and-forget and any Mongo failure is swallowed-and-logged so the 401 response is never delayed. The new fields are gated by `blocked: true` so legit sessions stay untouched, and two sparse indexes (`{siteKey, blocked, createdAt}`, `{ruleHash}`) keep the per-rule and per-client block aggregations the Traffic page will query off the existing sessions collection without bloating the index on normal traffic.
- c80a05b: Split `solutionTimeout` (challenge issuance → user submission) from `verifiedTimeout` (submission → dapp's /verify call) on `UserSettings`. Historically `verifiedTimeout` gated both windows in `verifyRecency` (at /pow|puzzle/solution submit) and in `serverVerifyPowCaptchaSolution` (at /verify), even though its doc comment only described the latter. Adds `solutionTimeout` to `ClientSettingsSchema` (zod) and `UserSettingsSchema` (mongoose) with `DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT` (60s) as default. `submitPoWCaptchaSolution` and `submitPuzzleCaptchaSolution` now use `solutionTimeout` for the recency check and fall back to `verifiedTimeout` for pre-existing client records so behaviour is preserved until those records are backfilled. The `/verify` path is unchanged. Operators can now tighten `verifiedTimeout` (e.g. 20s) to invalidate stale solutions at verify time without also shrinking the user's solve budget.

### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c1c7998]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0
  - @prosopo/user-access-policy@3.10.0

## 4.9.2
### Patch Changes

- Updated dependencies [b520cd9]
  - @prosopo/user-access-policy@3.9.1

## 4.9.1
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

## 4.9.0
### Minor Changes

- bc3813d: Surface dnsEvent observations across the verify and frictionless flows. Each verify path now enriches the session's dnsEvent IPs once and passes the result to the traffic filter, decision machine, IP validation, and usage counters. Adds `scoreComponents.dnsAsymmetry` (Zod + TS interface + mongoose) computed from resolver / peer ipInfo plus path validity, with the score patched onto the session at DNS event ingest time so it weights subsequent reads. Adds `CounterDimension.peerIp` for rate-limit keys keyed on the dnsEvent peer IP.

### Patch Changes

- 2972def: chore(deps-dev): bump vitest from 3.2.4 to 3.2.6 in /packages/types-database
- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types@4.4.0
  - @prosopo/user-access-policy@3.8.1

## 4.8.2
### Patch Changes

- Updated dependencies [2f459ce]
  - @prosopo/user-access-policy@3.8.0

## 4.8.1
### Patch Changes

- b03dad1: Thread `shadowDomPenalty: boolean` from the catcher's encrypted detection payload through `decryptPayload` and persist it on `Session.scoreComponents` so the flag is queryable in Mongo without inferring it from `baseScore=1 ∧ ¬triggeredDetectors`. Field is optional on the wire (position 6); older catcher bundles omit it and `shadowDomPenalty` stays undefined.
- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/user-access-policy@3.7.12

## 4.8.0
### Minor Changes

- 2392aaf: Integrate the prosopo/dns sidecar against the procaptcha provider.
  
  - New admin endpoint `POST /v1/prosopo/provider/admin/dns/event` ingests batched DNS observation events from the sidecar (auth: admin sr25519 JWT) and merges resolver / peer IPs onto the matching Session record under a new `Session.dnsEvent` field.
  - Frictionless response carries a per-session `dns_url` when the pronode has `DNS_EVENT_SUBZONE` + `DNS_EVENT_HMAC_SECRET` set. The HMAC path mirrors the sidecar's Rust implementation so both sides agree without shared per-request state.
  - The frictionless bundle fires one no-cors GET to `dns_url` on detection completion (fire-and-forget; failures never affect the captcha flow).
  - `dns_url` is included on the `reuse_session` short-circuit path too, not only the new-session path — otherwise repeat visits from the same user/IP/sitekey combination silently dropped the observation hop.
  - Deploy compose entry for the sidecar plus a Caddy `layer4` SNI-passthrough block so the sidecar terminates TLS itself (no Cloudflare token needed). Caddy image must be rebuilt with the `caddy-l4` plugin.

### Patch Changes

- a1d60db: Add optional internal ML labelling fields (label/labelReason/labelledBy/labelledAt) to captcha records.
- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [97cf7bd]
- Updated dependencies [6ca1125]
- Updated dependencies [32a591b]
  - @prosopo/types@4.3.0
  - @prosopo/logger@1.0.2
  - @prosopo/common@3.1.38
  - @prosopo/user-access-policy@3.7.11

## 4.7.8
### Patch Changes

- 6c26669: Add per-site honeypot trap. When enabled, the provider attaches an encoded question (morse or semaphore, base64-wrapped) in the `x-prosopo-meta` response header on frictionless responses. The widget renders the value into an off-screen hidden input with `name="email_confirm"`; bots that auto-fill text inputs populate it and the value rides back on the solution submit as `clientMetaData.hp`, which is persisted on the `StoredCaptcha` record. Falls back to a random phrase from `PROSOPO_HONEYPOT_PHRASE_BANK_PATH` when no custom question is configured.
- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/user-access-policy@3.7.10

## 4.7.7
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.
- Updated dependencies [0fd81af]
  - @prosopo/common@3.1.37
  - @prosopo/logger@1.0.1
  - @prosopo/user-access-policy@3.7.9

## 4.7.6
### Patch Changes

- cdbc5ed: fix(types-database): persist `autoBanScoreThreshold` on client settings
  
  `autoBanScoreThreshold` was added to the zod `ClientSettingsSchema` and the
  frictionless decision machine in #2592, but the Mongoose `UserSettingsSchema`
  was never updated. Mongoose's strict mode silently dropped the field on every
  `$set`, so neither the portal account collection nor the provider
  `ClientRecord` collection ever persisted the value — meaning a system user
  could set the threshold in the portal, the API would accept it, but the
  provider would never actually enforce it.
  
  Adds the field to the Mongoose schema (`Number`, `min: 0`, `required: false`,
  no default) so the property is preserved on write.
- 4d9923e: test(provider): integration test asserting every IUserSettings field round-trips through Mongo
  
  Registers a site key with a fully-populated `IUserSettings` (every field set, including the new `storeMetadata` and the existing nested `contextAware` / `ipValidationRules` / `spamFilter` / `trafficFilter` sub-documents), reads the record back from Mongo via the real Mongoose write/read path, and asserts each top-level and nested field survived. This is the regression test class that would have caught the `autoBanScoreThreshold` Mongoose-strict-mode drop on the original PR.
  
  While adding the test it caught another field that was in zod `ClientSettingsSchema` but missing from the Mongoose `UserSettingsSchema`: `puzzleTolerance`. The fix is bundled here — adds `puzzleTolerance: { type: Number, required: false }` to `UserSettingsSchema` so it actually persists.
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
- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0
  - @prosopo/user-access-policy@3.7.8

## 4.7.5
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
  - @prosopo/user-access-policy@3.7.7

## 4.7.4
### Patch Changes

- 7e8cbb7: fix(types-database): replace broken partial indexes with regular non-sparse indexes for CHECK_IP_INFO / PARSE_USER_AGENT backfill queries
  
  The original partial-index approach (#2587, then #2589) couldn't work in MongoDB:
  
  - `partialFilterExpression` isn't allowed on `_id` indexes (caught by #2589).
  - More fundamentally, `{ $exists: false }` is rewritten internally as `$not: { $exists: true }`, and `$not` isn't on the partial-filter operator allowlist either. So no key field could rescue the partial-index design.
  
  Replace the six broken partial-index definitions on `PoWCaptchaRecordSchema`, `PuzzleCaptchaRecordSchema`, and `UserCommitmentRecordSchema` with regular non-sparse indexes on the fields themselves (`{ ipInfo: 1 }` and `{ parsedUserAgentInfo: 1 }`). Non-sparse indexes include entries for missing-field documents (stored as null), which the planner can use to satisfy `{ <field>: { $exists: false } }` via `IXSCAN`.
  
  Note: both layers that swallowed the original `createIndex` failures (`CaptchaDatabase.ensureIndexes()` `.catch` warning, and Mongoose `autoIndex`'s un-listened `'index'` event) are still silent — worth a follow-up so the next bad schema change doesn't ship unnoticed.
- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/types@4.1.3
  - @prosopo/locale@3.2.4
  - @prosopo/user-access-policy@3.7.6
  - @prosopo/common@3.1.36

## 4.7.3
### Patch Changes

  - @prosopo/types@4.1.2
  - @prosopo/user-access-policy@3.7.5

## 4.7.2
### Patch Changes

- Updated dependencies [53bfd45]
- Updated dependencies [91958da]
  - @prosopo/locale@3.2.3
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35
  - @prosopo/user-access-policy@3.7.4

## 4.7.1
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/user-access-policy@3.7.3

## 4.7.0
### Minor Changes

- d865319: Add puzzle captcha (drag-to-target challenge) as a new captcha type:
  provider endpoints, manager + widget package, types, demo pages, and
  a `puzzleTolerance` site setting.

### Patch Changes

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
  - @prosopo/locale@3.2.2
  - @prosopo/common@3.1.34
  - @prosopo/user-access-policy@3.7.2

## 4.6.2
### Patch Changes

- 819ed95: Adding invisible mode to session data
- Updated dependencies [819ed95]
  - @prosopo/types@3.16.1
  - @prosopo/user-access-policy@3.7.1

## 4.6.1
### Patch Changes

- Updated dependencies [60ba3b1]
  - @prosopo/user-access-policy@3.7.0

## 4.6.0
### Minor Changes

- 74092d0: Stream data back to central for decisions

## 4.5.3
### Patch Changes

- f6a4402: API endpoint for removing site keys
- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types@3.16.0
  - @prosopo/user-access-policy@3.6.24

## 4.5.2
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0
  - @prosopo/user-access-policy@3.6.23

## 4.5.1
### Patch Changes

- 946a8ba: Abuser score threshold
- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
- Updated dependencies [b94890c]
  - @prosopo/types@3.14.1
  - @prosopo/locale@3.2.1
  - @prosopo/common@3.1.33
  - @prosopo/user-access-policy@3.6.22

## 4.5.0
### Minor Changes

- 42650db: Add better spam rules and move ipinfo service to local instead of external

### Patch Changes

- fc514dd: ability to block different types of traffic
- Updated dependencies [fc514dd]
- Updated dependencies [42650db]
  - @prosopo/locale@3.2.0
  - @prosopo/types@3.14.0
  - @prosopo/common@3.1.32
  - @prosopo/user-access-policy@3.6.21

## 4.4.14
### Patch Changes

- Updated dependencies [4a9c518]
  - @prosopo/common@3.1.31
  - @prosopo/user-access-policy@3.6.20

## 4.4.13
### Patch Changes

  - @prosopo/types@3.13.3
  - @prosopo/user-access-policy@3.6.19

## 4.4.12
### Patch Changes

  - @prosopo/types@3.13.2
  - @prosopo/user-access-policy@3.6.18

## 4.4.11
### Patch Changes

  - @prosopo/types@3.13.1
  - @prosopo/user-access-policy@3.6.17

## 4.4.10
### Patch Changes

- Updated dependencies [e6d9553]
  - @prosopo/types@3.13.0
  - @prosopo/user-access-policy@3.6.16

## 4.4.9
### Patch Changes

- e1ea65f: Better spam email domain checking
- c316257: Adding sync fo sessions wrt captcha status
- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/types@3.12.3
  - @prosopo/user-access-policy@3.6.15

## 4.4.8
### Patch Changes

- adb89a6: Disposable email checking
- Updated dependencies [adb89a6]
  - @prosopo/locale@3.1.29
  - @prosopo/types@3.12.2
  - @prosopo/common@3.1.30
  - @prosopo/user-access-policy@3.6.14

## 4.4.7
### Patch Changes

- a90eb54: We know WHAT happens but we don't know WHY happens
- Updated dependencies [c5ee492]
- Updated dependencies [a90eb54]
  - @prosopo/common@3.1.29
  - @prosopo/types@3.12.1
  - @prosopo/user-access-policy@3.6.13

## 4.4.6
### Patch Changes

- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/types@3.12.0
  - @prosopo/user-access-policy@3.6.12

## 4.4.5
### Patch Changes

- 8148587: Clustering
- Updated dependencies [8148587]
  - @prosopo/types@3.11.1
  - @prosopo/user-access-policy@3.6.11

## 4.4.4
### Patch Changes

- 90033e9: Add missing schema field

## 4.4.3
### Patch Changes

- Updated dependencies [7f6ffc5]
  - @prosopo/types@3.11.0
  - @prosopo/user-access-policy@3.6.10

## 4.4.2
### Patch Changes

- 93fa086: Add decision engine endpoints
- Updated dependencies [93fa086]
  - @prosopo/types@3.10.2
  - @prosopo/user-access-policy@3.6.9

## 4.4.1
### Patch Changes

- cde7550: enhance/frictionless-headers-db-field
- Updated dependencies [cde7550]
  - @prosopo/types@3.10.1
  - @prosopo/user-access-policy@3.6.8

## 4.4.0
### Minor Changes

- ad6d622: Separate types from mongoose schemas to avoid bundling mongoose in frontend

### Patch Changes

- fa95c5f: zod types for db records
- Updated dependencies [ad6d622]
  - @prosopo/types@3.10.0
  - @prosopo/user-access-policy@3.6.7

## 4.3.1
### Patch Changes

- Updated dependencies [ff58a70]
  - @prosopo/types@3.9.0
  - @prosopo/user-access-policy@3.6.6

## 4.3.0
### Minor Changes

- 3feeea4: Store geolocation. Remove pending image captcha collection

## 4.2.4
### Patch Changes

- 4c08158: Skip ip validation unit tests
- d2431cd: Allow IP validation rules to be disabled
- Updated dependencies [d2431cd]
  - @prosopo/types@3.8.4
  - @prosopo/user-access-policy@3.6.5

## 4.2.3
### Patch Changes

- 8dad7f3: Implement frictionless blocks

## 4.2.2
### Patch Changes

- Updated dependencies [bd6995b]
  - @prosopo/user-access-policy@3.6.4
  - @prosopo/types@3.8.3

## 4.2.1
### Patch Changes

- 9633e58: Add captcha type to decision machine and run on image verification"
- Updated dependencies [9633e58]
  - @prosopo/types@3.8.2
  - @prosopo/user-access-policy@3.6.3

## 4.2.0
### Minor Changes

- 4299cae: Adding site key to session records

### Patch Changes

- f52a5c1: Adding decision machine to provider for behavior detection
- Updated dependencies [f52a5c1]
  - @prosopo/types@3.8.1
  - @prosopo/user-access-policy@3.6.2

## 4.1.6
### Patch Changes

- Updated dependencies [ed87b6f]
  - @prosopo/user-access-policy@3.6.1

## 4.1.5
### Patch Changes

- 3acc333: Update pow record at verify
- 3acc333: Fix type
- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- fe9fe22: adding api returns
- 3acc333: Release 3.3.0
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [17854a7]
- Updated dependencies [7543d17]
- Updated dependencies [fe9fe22]
- Updated dependencies [3acc333]
  - @prosopo/types@3.8.0
  - @prosopo/user-access-policy@3.6.0
  - @prosopo/common@3.1.28
  - @prosopo/locale@3.1.28

## 4.1.4
### Patch Changes

- Updated dependencies [378a896]
- Updated dependencies [90fddd8]
  - @prosopo/user-access-policy@3.5.37

## 4.1.3
### Patch Changes

- Updated dependencies [7c475dc]
  - @prosopo/user-access-policy@3.5.36

## 4.1.2
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/user-access-policy@3.5.35

## 4.1.1
### Patch Changes

- 345b25b: pow coord
- Updated dependencies [345b25b]
  - @prosopo/types@3.7.1
  - @prosopo/user-access-policy@3.5.34

## 4.1.0
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
- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
- Updated dependencies [e01227b]
  - @prosopo/types@3.7.0
  - @prosopo/locale@3.1.27
  - @prosopo/common@3.1.27
  - @prosopo/user-access-policy@3.5.33

## 4.0.6
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/common@3.1.26
  - @prosopo/locale@3.1.26
  - @prosopo/types@3.6.4
  - @prosopo/user-access-policy@3.5.32

## 4.0.5
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/common@3.1.25
  - @prosopo/locale@3.1.25
  - @prosopo/types@3.6.3
  - @prosopo/user-access-policy@3.5.31

## 4.0.4
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/user-access-policy@3.5.30
  - @prosopo/common@3.1.24
  - @prosopo/locale@3.1.24
  - @prosopo/types@3.6.2

## 4.0.3
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/common@3.1.23
  - @prosopo/locale@3.1.23
  - @prosopo/types@3.6.1
  - @prosopo/user-access-policy@3.5.29

## 4.0.2
### Patch Changes

- 0a9887c: Remove unique from token index

## 4.0.1
### Patch Changes

- 3e5d80a: add reason field

## 4.0.0
### Major Changes

- 8f22479: Update settings schema

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
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/user-access-policy@3.5.28
  - @prosopo/types@3.6.0
  - @prosopo/common@3.1.22
  - @prosopo/locale@3.1.22
  - @prosopo/config@3.1.22

## 3.3.13
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/user-access-policy@3.5.27

## 3.3.12
### Patch Changes

- cb8ab85: head entropy for bot detection
- Updated dependencies [cb8ab85]
  - @prosopo/types@3.5.10
  - @prosopo/user-access-policy@3.5.26

## 3.3.11
### Patch Changes

- 43907e8: Convert timestamp fields from numbers to Date objects throughout codebase
- b4639ec: Merge frictionless tokens into sessions
- 7101036: Force consistent IPs logic
- Updated dependencies [43907e8]
- Updated dependencies [005ce66]
- Updated dependencies [7101036]
  - @prosopo/types@3.5.9
  - @prosopo/user-access-policy@3.5.25

## 3.3.10
### Patch Changes

- b10a65f: Allow saving webview
- 6420187: Save iframe
- Updated dependencies [e5c259d]
  - @prosopo/types@3.5.8
  - @prosopo/user-access-policy@3.5.24

## 3.3.9
### Patch Changes

- 3a027ef: Fix session storer
- 3a027ef: Release cycle
- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
  - @prosopo/user-access-policy@3.5.23
  - @prosopo/common@3.1.21
  - @prosopo/config@3.1.21
  - @prosopo/locale@3.1.21
  - @prosopo/types@3.5.7

## 3.3.8
### Patch Changes

- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/user-access-policy@3.5.22

## 3.3.7
### Patch Changes

- 494c5a8: Updated payload
- Updated dependencies [494c5a8]
  - @prosopo/types@3.5.5
  - @prosopo/user-access-policy@3.5.21

## 3.3.6
### Patch Changes

- 08ff50f: IP Validation Schema update
- Updated dependencies [08ff50f]
  - @prosopo/types@3.5.4
  - @prosopo/user-access-policy@3.5.20

## 3.3.5
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20
  - @prosopo/common@3.1.20
  - @prosopo/locale@3.1.20
  - @prosopo/types@3.5.3
  - @prosopo/user-access-policy@3.5.19

## 3.3.4
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/user-access-policy@3.5.18
  - @prosopo/locale@3.1.19
  - @prosopo/types@3.5.2
  - @prosopo/config@3.1.19

## 3.3.3
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/user-access-policy@3.5.17
  - @prosopo/common@3.1.18
  - @prosopo/locale@3.1.18
  - @prosopo/config@3.1.18

## 3.3.2
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/user-access-policy@3.5.16
  - @prosopo/common@3.1.17
  - @prosopo/locale@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/config@3.1.17

## 3.3.1
### Patch Changes

- b6794f8: Timestamp decay fn
- 11303d9: Release 3.4.0
- bac2d91: Fix mongoose composite ip getting
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/user-access-policy@3.5.15
  - @prosopo/common@3.1.16
  - @prosopo/locale@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/config@3.1.16

## 3.3.0
### Minor Changes

- 6768f14: Update salt

### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/user-access-policy@3.5.14
  - @prosopo/common@3.1.15
  - @prosopo/locale@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/config@3.1.15

## 3.2.2
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/user-access-policy@3.5.13
  - @prosopo/common@3.1.14
  - @prosopo/locale@3.1.14
  - @prosopo/config@3.1.14

## 3.2.1
### Patch Changes

- 5137f01: Update pow record at verify
- 0555cd8: Fix type
- 008d112: Release 3.3.0
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types@3.2.1
  - @prosopo/user-access-policy@3.5.12
  - @prosopo/common@3.1.13
  - @prosopo/locale@3.1.13
  - @prosopo/config@3.1.13

## 3.2.0
### Minor Changes

- cf48565: Store additional details. Remove duplicate indexes.
- 260de39: Fix indexes so that stuff properly expires

### Patch Changes

- d644c04: Make schema public
- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [0824221]
  - @prosopo/types@3.2.0
  - @prosopo/user-access-policy@3.5.11
  - @prosopo/common@3.1.12
  - @prosopo/locale@3.1.12
  - @prosopo/config@3.1.12

## 3.1.5
### Patch Changes

- 0d1a33e: Adding ipcomparison service with user features
- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/locale@3.1.11
  - @prosopo/types@3.1.4
  - @prosopo/user-access-policy@3.5.10
  - @prosopo/common@3.1.11
  - @prosopo/config@3.1.11

## 3.1.4
### Patch Changes

- a8a9251: Add index on IP parts
- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/user-access-policy@3.5.9
  - @prosopo/common@3.1.10
  - @prosopo/locale@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/config@3.1.10

## 3.1.3
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
  - @prosopo/common@3.1.9
  - @prosopo/locale@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/config@3.1.9

## 3.1.2
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/types@3.1.1
  - @prosopo/user-access-policy@3.5.7
  - @prosopo/common@3.1.8
  - @prosopo/locale@3.1.8
  - @prosopo/config@3.1.8

## 3.1.1
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/user-access-policy@3.5.6
  - @prosopo/common@3.1.7
  - @prosopo/locale@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/config@3.1.7

## 3.1.0
### Minor Changes

- 9b92339: fix/ipv6-in-captcha-flow

### Patch Changes

- a07db04: Release 3.1.12
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
  - @prosopo/config@3.1.6
  - @prosopo/user-access-policy@3.5.5
  - @prosopo/common@3.1.6
  - @prosopo/locale@3.1.6
  - @prosopo/types@3.0.10

## 3.0.19
### Patch Changes

- Updated dependencies [553025d]
  - @prosopo/user-access-policy@3.5.4

## 3.0.18
### Patch Changes

- d8e855c: Adding checks for IP consistency throughout the verification process
- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
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
  - @prosopo/user-access-policy@3.5.2

## 3.0.16
### Patch Changes

- 1f3a02f: Release 3.1.8
- Updated dependencies [1f3a02f]
  - @prosopo/user-access-policy@3.5.1

## 3.0.15
### Patch Changes

- Updated dependencies [e0628d9]
  - @prosopo/user-access-policy@3.5.0

## 3.0.14
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
- Updated dependencies [e090e2f]
  - @prosopo/config@3.1.4
  - @prosopo/user-access-policy@3.4.1
  - @prosopo/common@3.1.3
  - @prosopo/types@3.0.7

## 3.0.13
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
  - @prosopo/common@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/config@3.1.2

## 3.0.11
### Patch Changes

- 625fef8: ua parsing

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
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.0.9
### Patch Changes

- Updated dependencies [b7c3258]
  - @prosopo/user-access-policy@3.3.0

## 3.0.8
### Patch Changes

- Updated dependencies [cdf7c29]
  - @prosopo/user-access-policy@3.2.1

## 3.0.7
### Patch Changes

- Updated dependencies [a7164ce]
  - @prosopo/user-access-policy@3.2.0

## 3.0.6
### Patch Changes

- b0d7207: Types for proper rotation
- Updated dependencies [b0d7207]
  - @prosopo/types@3.0.3
  - @prosopo/user-access-policy@3.1.5

## 3.0.5
### Patch Changes

  - @prosopo/user-access-policy@3.1.4

## 3.0.4
### Patch Changes

  - @prosopo/user-access-policy@3.1.3

## 3.0.3
### Patch Changes

- f682f0c: Moving type and fixing i18n config
- Updated dependencies [f682f0c]
  - @prosopo/types@3.0.2
  - @prosopo/common@3.0.2
  - @prosopo/user-access-policy@3.1.2

## 3.0.2
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/user-access-policy@3.1.1

## 3.0.1
### Patch Changes

- 913f2a6: Make custom expiration times work in redis. Make redis internal only and persist data
- Updated dependencies [913f2a6]
  - @prosopo/user-access-policy@3.1.0

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/user-access-policy@3.0.0
  - @prosopo/common@3.0.0
  - @prosopo/types@3.0.0

## 2.7.6
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0
  - @prosopo/user-access-policy@2.6.8

## 2.7.5
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/user-access-policy@2.6.7
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1

## 2.7.4
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/types@2.9.0
  - @prosopo/common@2.7.1
  - @prosopo/user-access-policy@2.6.6

## 2.7.3
### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/user-access-policy@2.6.5

## 2.7.2

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/types@2.7.1
  - @prosopo/user-access-policy@2.6.4

## 2.7.1

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0
  - @prosopo/user-access-policy@2.6.3

## 2.7.0

### Minor Changes

- cf59998: Update DB schema

## 2.6.2

### Patch Changes

- Updated dependencies [6ff193a]
  - @prosopo/types@2.6.2
  - @prosopo/user-access-policy@2.6.2

## 2.6.1

### Patch Changes

- 52feffc: Adjustable difficulty img captcha
- Updated dependencies [52feffc]
  - @prosopo/types@2.6.1
  - @prosopo/user-access-policy@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/common@2.6.0
  - @prosopo/types@2.6.0
  - @prosopo/user-access-policy@2.6.0
