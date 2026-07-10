# @prosopo/provider

## 4.15.3
### Patch Changes

- 6abff15: Fix request-scoped logger fields leaking across concurrent captcha requests, and give every endpoint a proper request/response envelope in OpenObserve.
  
  Three interlocking changes:
  
  - **`Tasks.setLogger` no longer mutates `db.logger`.** `env.getDb()` returns a
    process-wide singleton; overwriting `db.logger` on every request meant two
    concurrent captcha submits raced, and whichever request landed second
    stamped its `user`/`siteKey`/`sessionId` bindings onto the *other* request's
    DB-level log lines. In practice you'd see a `PuzzleCaptcha record updated
    successfully` for user A's challenge tagged with user B's account and site
    key, breaking log-based forensics. `setLogger` still updates the per-request
    Tasks instance and its per-request manager instances (those are safe —
    they're constructed inside the Tasks constructor) but stops mutating the
    shared DB. Callers in `getPoWCaptchaChallenge` and `getPuzzleCaptchaChallenge`
    now pass `req.logger` directly into `new Tasks(env, req.logger)` and drop
    the redundant `.setLogger(req.logger)` call that followed.
  
  - **`requestLoggerMiddleware` now emits `Request received` and `Response sent`
    envelope lines on every route** (with `method`, `path`, `status`,
    `durationMs`, and the request id). Previously only `/frictionless` had a
    `res.on('finish', ...)` block, so `getPow/PuzzleCaptchaChallenge`,
    `submitPow/PuzzleCaptchaSolution`, `verify.ts` etc. produced no envelope in
    OO — a challenge issued by one endpoint and verified by another shared
    nothing you could group on. Health-probe paths (`/healthz`, `/health`,
    `/readyz`) are excluded so they don't drown the stream. The middleware
    also now mirrors `x-request-id` back on the outbound response so callers
    downstream of the Node process can correlate without depending on Caddy.
  
  - **`requestId` (set on the request logger via `.with({requestId})`) is
    promoted to a top-level `req_id` field on the emitted JSON log record.**
    OpenObserve indexes top-level fields as their own columns, so
    `WHERE req_id = '…'` is now cheap; previously the id only lived inside
    `data.requestId`, which flattened to `data_requestid` in OO's ingestion
    and had no top-level column. `data.requestId` is preserved for backwards
    compatibility with existing dashboards. Two new unit tests in
    `@prosopo/logger` cover the promotion and the "absent when unset" case.
- b07b448: fix(user-access-policy): route non-block strict-match rule lookups through the split-query path
  
  Live 2026-07-10 Twickets regression: a portal-authored Restrict/image rule scoped to `clientId + numericIp` was silently dropped from the frictionless access-policy lookup even though the rule was correctly stored in Redis and indexed. The DM then fell through to `default_pow` and served POW instead of the configured image challenge.
  
  Root cause: the `findRulesRanked` FT.AGGREGATE ranker used for non-block lookups capped candidates at `SERVER_SIDE_RANK_TOP_N = 20` after a server-side `SORTBY @_rank`. Under Greedy matching with `matchingFieldsOnly=true`, the query is a wide OR that matches every rule missing `headHash`, `coords`, or `headersHash` — for a Twickets-shaped tenant (~860 candidates) the top 20 slots were filled by higher-specificity SIMD_REPLAY and SUDDEN_VOLUME_INCREASE Block rules that didn't actually apply to the request. The specific-IP Restrict rule (specificity 2) was pushed out; Node saw only irrelevant candidates; `rankCandidateRules` filtered them all out via `ruleApplies`; the lookup returned `[]`.
  
  Fix: extend the existing `findBlockRulesSplit` path (previously the hot path for `blockOnly=true` callers) to cover every `matchingFieldsOnly` call. Each sub-query hits a discriminating posting list (exact numericIp, exact ja4Hash, etc.), so the ip:exact probe returns exactly the rules literally matching the request IP — the specific-IP rule can no longer be pushed off the end by irrelevant candidates from other probes. `blockOnly` is now a flag on the sub-query builder that narrows probes to `@type:{block}` when set. Split reader now sorts candidates by (specificity desc, block-first) so direct reader consumers see the same order the old FT.AGGREGATE ranker gave.
  
  Regression coverage added:
  
  - Unit: `buildScopedRulesSubQueries` emits/omits `@type:{block}` correctly per `blockOnly` flag and produces the same probe shape either way.
  - Integration: specific-IP Restrict rule survives when 40 higher-specificity irrelevant Block rules co-exist on the same tenant (mirrors the live Twickets shape).
  
  Benchmarks unchanged: split hot path p50=1.4ms / p99=2.2ms across 19,300 seeded rules; 100×10 concurrent storm holds ~990 req/s.
- Updated dependencies [6abff15]
- Updated dependencies [29b5c6a]
- Updated dependencies [b07b448]
  - @prosopo/logger@2.0.3
  - @prosopo/api-express-router@3.1.43
  - @prosopo/database@3.15.12
  - @prosopo/user-access-policy@3.12.3
  - @prosopo/api-route@2.6.52
  - @prosopo/common@3.1.45
  - @prosopo/datasets@3.1.50
  - @prosopo/env@3.6.12
  - @prosopo/ipinfo@0.2.36
  - @prosopo/redis-client@1.0.29
  - @prosopo/types-database@4.11.11
  - @prosopo/types-env@2.10.11
  - @prosopo/keyring@2.9.56
  - @prosopo/load-balancer@2.10.10

## 4.15.2
### Patch Changes

- 550d20a: Keep the provider admin endpoints working while `MAINTENANCE_MODE` is on. Previously the admin/access-rule router was skipped entirely at boot in maintenance mode — `Environment.isReady()` never connected the DB, so `env.getDb()` threw and the DB-backed `Tasks` couldn't be constructed — which meant adding/removing site keys (access rules), detector keys and decision machines all 404'd on a node in maintenance mode.
  
  Now, in maintenance mode `Environment.isReady()` creates the `ProviderDatabase` handle and connects in the **background** (without awaiting), so a slow or unavailable Mongo/Redis socket still can't gate boot, but `env.getDb()` returns a usable handle and the admin endpoints register and function. The captcha request path is unchanged — it still short-circuits to a maintenance "pass" before touching the DB. `blockMiddleware` now has an explicit maintenance-mode skip (it previously relied on `env.getDb()` throwing to no-op) so the blocklist/Redis lookup stays off the captcha hot path.
- 85e8857: Record both the top-frame URL and the widget's own iframe URL on frictionless sessions.
  
  Previously the client only sent one field (`currentUrl`), which for embedded widgets resolved to the top-frame URL — so we lost visibility into which iframe endpoint the session was actually loaded through. Now the client sends both:
  
  - `currentUrl`: the top-frame URL (same resolution rules as before — same-origin iframes read `window.top.location.href` directly; cross-origin iframes fall back to `document.referrer`).
  - `iframeUrl`: the widget's own frame URL when embedded. Undefined when the widget IS the top frame (nothing to distinguish).
  
  Both fields are sanitised client- and server-side (origin + path only; query string, fragment and any embedded credentials stripped). The provider persists both on the `Session` record and re-uses them on post-PoW escalation sessions. Only `currentUrl` is gated in the frictionless decision machine (unchanged — missing `currentUrl` still forces an image captcha); `iframeUrl` is recorded for analytics.
  
  Both fields are also surfaced to the decision machines as raw signals: `RoutingMachineRawSignals` gains an optional `iframeUrl` populated from the freshly decrypted frictionless payload on the `route` phase, from the persisted Session record on the `postPow` phase, and from the cached Session in the dedup replay path — matching how `currentUrl` is already threaded through.
  
  Additionally, sessions carry a new computed boolean `isProtect`, set at session-creation time when the widget iframe was served from `protect.<tenant>` and embedded in a page on the same tenant (subdomain-of matching, dot-boundary safe — see `isProtectDeployment` in `@prosopo/util`). Persisted only when true (same pattern as `isEscalation`) and backed by a sparse `{isProtect, createdAt}` index so analytics can cheaply retrieve Protect sessions without re-parsing URLs. Post-PoW escalation sessions inherit the flag from the origin session.
- Updated dependencies [550d20a]
- Updated dependencies [85e8857]
  - @prosopo/env@3.6.11
  - @prosopo/api@3.5.15
  - @prosopo/types@4.9.8
  - @prosopo/types-database@4.11.10
  - @prosopo/util@3.3.4
  - @prosopo/api-express-router@3.1.42
  - @prosopo/user-access-policy@3.12.2
  - @prosopo/common@3.1.44
  - @prosopo/database@3.15.11
  - @prosopo/datasets@3.1.49
  - @prosopo/ipinfo@0.2.35
  - @prosopo/keyring@2.9.55
  - @prosopo/load-balancer@2.10.9
  - @prosopo/types-env@2.10.10
  - @prosopo/logger@2.0.2
  - @prosopo/api-route@2.6.51
  - @prosopo/redis-client@1.0.28

## 4.15.1
### Patch Changes

- 494883f: Add a sparse compound index on `{ isEscalation: 1, createdAt: 1 }` to the Session collection. Sparse so ordinary frictionless sessions (which omit the field) don't add index entries.
- 8bde5df: Persist `isEscalation: true` on Session records minted by the post-PoW routing machine.
  
  The escalation path in `submitPoWCaptchaSolution.buildEscalation` creates a follow-up session (image or puzzle) whenever the router decides the PoW-verified user still needs a stronger challenge. Analytics couldn't previously separate those escalated sessions from cold frictionless sessions since both shared the same shape — every downstream count that wanted to reason about "did we escalate this user?" had to reverse-engineer the origin/escalation link from the redis cache mapping.
  
  The field is optional on the schema and only written when true, so ordinary frictionless sessions stay slim and older records still parse.
- Updated dependencies [494883f]
- Updated dependencies [8bde5df]
  - @prosopo/types-database@4.11.9
  - @prosopo/database@3.15.10
  - @prosopo/types@4.9.7
  - @prosopo/types-env@2.10.9
  - @prosopo/env@3.6.10
  - @prosopo/api@3.5.14
  - @prosopo/api-express-router@3.1.41
  - @prosopo/datasets@3.1.48
  - @prosopo/ipinfo@0.2.34
  - @prosopo/keyring@2.9.54
  - @prosopo/load-balancer@2.10.8
  - @prosopo/user-access-policy@3.12.1

## 4.15.0
### Minor Changes

- 7d7e767: perf(access-rules): split-query hot path + verdict cache with LRU and singleflight
  
  Reworks the block-lookup Redis path so per-request latency is bounded by matching-rules-per-request rather than total rules in the tenant. Rule populations in the 10k+ range no longer degrade tail latency.
  
  Key changes:
  
  - **Split-query read path**: `redisRulesSplitQuery.ts` builds one FT sub-query per populated request field (numericIp exact + CIDR, ja4Hash, userId, headHash, coords, countryCode, asn), each hitting a discriminating posting-list index instead of a single wide FT.AGGREGATE that scaled linearly in total rule count.
  - **`clientId="global"` sentinel**: writer stamps the sentinel on rules with no clientId so queries probe `@clientId:{X|global|ismissing}` instead of the expensive `ismissing()` set-difference walk. Transition-safe — legacy rules match via the ismissing branch until a rehash migrates them.
  - **HardBlockVerdictCache**: bounded LRU + TTL (10 s / 50k entries) with real LRU move-to-tail on hit and **singleflight `getOrCompute`** dedupe of concurrent misses — the wave-1 stampede fix for the frontend retry-loop shape.
  - **Request-scoped memo**: attached to `req` so blockMiddleware + downstream in-request checks share one Redis round-trip.
  
  Measured impact under 100-concurrent × 10-wave retry storm against a 19.3k-rule population: wave-1 p99 drops from 23 ms → 3 ms, throughput jumps from 28.5k → 61.5k req/s per process, 50 identical concurrent misses collapse to 1 storage call.

### Patch Changes

- 17bc76e: feat: switch handshake timings from milliseconds to microseconds
  
  Milliseconds bucket fast handshakes (local proxies, same-DC clients) to 0/1 and destroy the distribution shape we need for proxy detection. `time.Now()` on Linux is ~1μs precise via vDSO — μs is the honest resolution ceiling.
  
  Wire changes (must land together with the paired chaddy release):
  
  - Headers consumed by `handshakeTimingMiddleware`: `x-tls-tcp-to-chello-ms` / `x-tls-chello-to-handshake-ms` → `x-tls-tcp-to-chello-us` / `x-tls-chello-to-handshake-us`.
  - Request augmentation, `HandshakeTiming` fields, decision-machine input, `Session` shape (Zod + Mongoose schemas): `tcpToChelloMs` / `chelloToHandshakeMs` → `tcpToChelloUs` / `chelloToHandshakeUs`.
  - New sessions in `captchastorage.sessions` will now write `tcpToChelloUs` / `chelloToHandshakeUs` in μs. Historical `*Ms` fields on existing session records remain as-is (not migrated) — analytics that read both must range-scan by field name.
  
  Rollout: deploy paired chaddy image (emits `-Us` headers) simultaneously; the deploy-order window drops timing signal but no data corruption is possible (mismatched header names simply resolve to `undefined`).
- 2e68a8d: fix(provider): persist TLS handshake timings on escalation + short-circuit sessions
  
  `buildEscalation` (post-PoW image/puzzle escalation) and `runConfiguredCaptchaTypeShortCircuit` (sitekeys with a configured captchaType) both bypass `FrictionlessManager.setSessionParams`, so `req.tcpToChelloMs` / `req.chelloToHandshakeMs` were captured by the middleware but never landed on the resulting session record.
  
  Threads the current request's per-connection timings through both paths:
  
  - New optional `handshakeTiming` arg on `buildEscalation`, forwarded to `createSession`. Timings come from the current PoW-submit request, not from `originSession` (whose values belong to the earlier frictionless request's TCP connection).
  - New optional `tcpToChelloMs` / `chelloToHandshakeMs` on `ShortCircuitInput`, spread into the locally-built `sessionParams`.
  
  The frictionless main path (`sendCaptcha` / `registerBlockedSession`) was already correct — it merges from `setSessionParams`, which the handler populates.
- 4e77fa8: fix(provider): DNS-enriched extras now honour traffic filter toggles
  
  `checkTrafficFilter` previously applied the "VPN on datacenter" suppression only to the primary request IP: the enriched DNS peer/resolver IPs still tripped `DATACENTER_BLOCKED` even when the operator had `blockVpn` off. Real-world impact: Surfshark (and similar) users whose primary IP was a `providerType=isp` datacenter passed the primary check, but their DNS resolver — also on a datacenter range flagged as VPN — was blocked. The extras path silently overrode the operator's toggles.
  
  Changes:
  
  - Extras now go through the same evaluator as the primary IP — the internal `EvaluateOptions` / `suppressVpnDatacenterInteraction` split is gone.
  - Datacenter suppression is extended from VPN to all four overlapping categories: VPN, proxy, Tor, and crawler. If any of those flags is set on the IP and the operator has that specific `block*` toggle off, the datacenter rule is suppressed. Same rationale as the original VPN carve-out — those categories live on datacenter infrastructure by design.
  - Crawler check is skipped entirely on DNS extras. Public DNS resolvers like `8.8.8.8` and `1.1.1.1` share IP ranges with search crawlers, so `is_crawler=true` on a resolver is the resolver, not a crawler visiting the endpoint.
  
  Unit tests updated (`checkTrafficFilter.unit.test.ts`): the "does NOT apply VPN-datacenter suppression to extra IPs" test was flipped to assert the new behaviour, and coverage added for proxy/Tor/crawler suppression on both primary and extras, plus the extras-only crawler-skip.
- Updated dependencies [7d7e767]
- Updated dependencies [b3f351b]
- Updated dependencies [17bc76e]
  - @prosopo/user-access-policy@3.12.0
  - @prosopo/load-balancer@2.10.7
  - @prosopo/types@4.9.6
  - @prosopo/types-database@4.11.8
  - @prosopo/database@3.15.9
  - @prosopo/api@3.5.13
  - @prosopo/api-express-router@3.1.40
  - @prosopo/datasets@3.1.47
  - @prosopo/env@3.6.9
  - @prosopo/ipinfo@0.2.33
  - @prosopo/keyring@2.9.53
  - @prosopo/types-env@2.10.8

## 4.14.4
### Patch Changes

- 6cb3218: feat(provider): relax captcha-flow rate limits 5x and log 429s
  
  - Default rate limits for the captcha-flow endpoints (get/submit image, PoW, frictionless and puzzle challenges, plus the verify endpoints) are now 5x more permissive. The previous defaults were rate limiting legitimate widget traffic.
  - The provider now logs a warning whenever a request is rejected with a 429, including the path, IP and site key, so operators can alarm on sustained rate limiting.
- Updated dependencies [6cb3218]
  - @prosopo/types@4.9.5
  - @prosopo/api@3.5.12
  - @prosopo/api-express-router@3.1.39
  - @prosopo/database@3.15.8
  - @prosopo/datasets@3.1.46
  - @prosopo/env@3.6.8
  - @prosopo/ipinfo@0.2.32
  - @prosopo/keyring@2.9.52
  - @prosopo/load-balancer@2.10.6
  - @prosopo/types-database@4.11.7
  - @prosopo/types-env@2.10.7
  - @prosopo/user-access-policy@3.11.3

## 4.14.3
### Patch Changes

- de12b31: feat(provider): capture and persist per-TLS-connection handshake timings
  
  Adds `handshakeTimingMiddleware` that reads two new headers forwarded by the chaddy Caddy plugin and threads the values through to the frictionless session store, so every persisted Session document carries them alongside `ipInfo` / `headers` / the entropy fingerprints.
  
  - `X-TLS-TCP-To-Chello-Ms` — server-observed ms from TCP accept to first ClientHello byte
  - `X-TLS-Chello-To-Handshake-Ms` — server-observed ms from ClientHello to handshake complete
  
  Elevated values indicate the client's ClientHello traversed a proxy chain before reaching Caddy — the CH bytes only reach the terminating TCP stack after every hop, so the deltas inflate with the full client-to-exit RTT rather than just the last-mile RTT.
  
  Middleware wires in immediately after `ja4Middleware` in `startProviderApi`. Both fields are optional throughout (`tcpToChelloMs?: number`, `chelloToHandshakeMs?: number`) on `Session`, `SessionSchema`, and the Mongoose model, so pre-migration documents parse and dev requests that skipped TLS still write cleanly. `express.d.ts` extends `AugmentedRequest` and `Express.Request` with the same two optional fields. No handlers are modified beyond the frictionless captcha challenge path; persisting on the other captcha-type storage paths (image / PoW / puzzle direct) is a follow-up.
  
  Depends on chaddy plugin support for emitting the two headers.
- 770954b: feat(provider): surface handshake timings and currentUrl to routing machines
  
  Extends `RoutingMachineRawSignals` with three optional fields so operator-authored routing machines can read them alongside JA4, headers, UA, and SIMD:
  
  - `tcpToChelloMs?: number`
  - `chelloToHandshakeMs?: number`
  - `currentUrl?: string`
  
  Threaded through every raw-signal construction site — the frictionless hot path, the dedup routing replay, `submitPoWCaptchaSolution`, and the postPow routing context construction. Timing values come from the current request (per-connection, fresh at every entry). `currentUrl` comes from the freshly decrypted frictionless payload at the `route` phase and from the persisted Session at the `postPow` phase, since the submit request's Referer is the captcha iframe rather than the host page.
  
  Follows the earlier PR that added the middleware capture and Session persistence for the two timing fields; this PR completes the surface by making them visible to operator-authored routers.
- Updated dependencies [de12b31]
- Updated dependencies [770954b]
  - @prosopo/types@4.9.4
  - @prosopo/types-database@4.11.6
  - @prosopo/api@3.5.11
  - @prosopo/api-express-router@3.1.38
  - @prosopo/database@3.15.7
  - @prosopo/datasets@3.1.45
  - @prosopo/env@3.6.7
  - @prosopo/ipinfo@0.2.31
  - @prosopo/keyring@2.9.51
  - @prosopo/load-balancer@2.10.5
  - @prosopo/types-env@2.10.6
  - @prosopo/user-access-policy@3.11.2

## 4.14.2
### Patch Changes

- 5068381: fix(provider): skip the datacenter traffic-filter block when upstream classifies the provider as a consumer ISP (`providerType === "isp"`).
  
  Motivation. Consumer ISPs like Afrihost (AS37611), Comcast, and BT are occasionally flagged `is_datacenter=true` by the upstream classifier because part of their ASN hosts B2B or hosting services, but the eyeball ranges behind those ASNs carry ordinary end-users. Observed on prod at commitment `0xd3f919c0…fa03` (provider `pronode15`): a real user in Johannesburg on `165.73.62.88` was rejected with `API.DATACENTER_BLOCKED` despite the same payload reporting `providerType: "isp"` and `asnOrganization: "AFRIHOST SP (PTY) LTD"`. The `providerType` categorisation is stronger evidence of consumer traffic than the `isDatacenter` boolean.
  
  - `checkTrafficFilter` short-circuits the datacenter rule when `ipInfo.providerType === "isp"`. Missing `providerType` preserves the previous behaviour.
  - Earlier rules (VPN, Tor, proxy, abuser) still fire first, so the ISP flag cannot be used to bypass those checks.
  - Suppression applies to both the primary IP and the extras list.

## 4.14.1
### Patch Changes

- Updated dependencies [18d0287]
  - @prosopo/types@4.9.3
  - @prosopo/api@3.5.10
  - @prosopo/api-express-router@3.1.37
  - @prosopo/database@3.15.6
  - @prosopo/datasets@3.1.44
  - @prosopo/env@3.6.6
  - @prosopo/ipinfo@0.2.30
  - @prosopo/keyring@2.9.50
  - @prosopo/load-balancer@2.10.4
  - @prosopo/types-database@4.11.5
  - @prosopo/types-env@2.10.5
  - @prosopo/user-access-policy@3.11.1

## 4.14.0
### Minor Changes

- ca78a0c: Add an `os` (operating system) match dimension to user access policies.
  
  The provider now classifies each request's operating system server-side from the User-Agent (`classifyOs`, returning one of `windows`/`macos`/`ios`/`android`/`linux`/`unknown`) and threads it into the user scope used to match access rules, so a `Block` or `Restrict` rule can target a specific OS. The OS is always populated (falling back to `unknown`) and derived from the full User-Agent rather than the easily-omitted `sec-ch-ua-platform` client hint, so it cannot be bypassed by dropping client hints. `os` is stored and indexed in Redis as a TAG (mirroring `countryCode`) and contributes one point to rule specificity ranking.

### Patch Changes

- Updated dependencies [ca78a0c]
- Updated dependencies [8814425]
  - @prosopo/user-access-policy@3.11.0
  - @prosopo/api@3.5.9
  - @prosopo/database@3.15.5
  - @prosopo/types-database@4.11.4
  - @prosopo/env@3.6.5
  - @prosopo/types-env@2.10.4
  - @prosopo/api-express-router@3.1.36

## 4.13.4
### Patch Changes

- 55b0850: fix(provider): on equal specificity, pick the harshest matching access rule. Specificity remains the primary criterion (a more-specific rule still wins), but the equal-specificity tiebreaker is extended from the previous Block-vs-Restrict-only severity check to a full harshness ordering: Block > Restrict[image, rounds DESC] > Restrict[puzzle] > Restrict[pow]. `deferToVerify` continues to control request-time vs verify-time enforcement and doesn't affect ranking.
- 7a434e0: feat(provider): escalate verified PoW solves with missing coordinates to an image captcha. Every current widget embeds the checkbox click position in the solution salt, so a verified solve that arrives without coordinates didn't come through the official widget path. Such session-linked solves are now escalated to an image captcha via the existing post-PoW routing/escalation mechanism instead of being approved outright. Adds the `MISSING_COORDINATES` FrictionlessReason.
- Updated dependencies [f9e8c94]
- Updated dependencies [7a434e0]
  - @prosopo/locale@3.2.6
  - @prosopo/types@4.9.2
  - @prosopo/api-express-router@3.1.35
  - @prosopo/common@3.1.43
  - @prosopo/types-database@4.11.3
  - @prosopo/api@3.5.8
  - @prosopo/database@3.15.4
  - @prosopo/datasets@3.1.43
  - @prosopo/env@3.6.4
  - @prosopo/ipinfo@0.2.29
  - @prosopo/keyring@2.9.49
  - @prosopo/load-balancer@2.10.3
  - @prosopo/types-env@2.10.3
  - @prosopo/user-access-policy@3.10.11

## 4.13.3
### Patch Changes

- acf19f8: fix(provider): evict dedup session in `/frictionless` when the configured routing machine wants a different captchaType than the cached session. Previously the dedup short-circuit only checked the access policy, so a freshly-published routing machine was invisible to any user with an active dedup pointer — the initial frictionless call returned the stale baseline, the post-PoW router then minted an escalation session the widget couldn't follow, and the next `/captcha/{type}` call surfaced `API.INCORRECT_CAPTCHA_TYPE` with no path forward. Adds `FrictionlessManager.applyRoutingMachine(baseline, ctx)` as the public wrapper used by the handler.

## 4.13.2
### Patch Changes

- 3e0ef08: fix(provider): peek (read-only) at the escalation session before consuming on the origin → escalation fallback
  
  Follow-on to the route() escalation NO_SESSION_FOUND fix (#2771). When the widget hit `/captcha/pow` with the origin sessionId after a PoW-submit escalation to image/puzzle, `isValidRequest` resolved the Redis `origin → escalation` mapping and then immediately consumed the escalation session via `checkAndRemoveSession`. Because the escalation session's `captchaType` did not match the requested type, the handler returned `INCORRECT_CAPTCHA_TYPE` — and worse, the escalation session was already gone, so a widget that *did* know to switch to `/captcha/image` with the escalation sessionId from the PoW-submit envelope had nothing left to consume. Production rate jumped from ~4/hour on 3.6.47 to 58/hour on the single 3.6.49 node.
  
  The fix peeks the escalation session read-only first (`getSessionRecordBySessionId`) and only calls `checkAndRemoveSession` when `peeked.captchaType === requestedCaptchaType`. On mismatch the session is left intact, the Redis pointer is still dropped (single-use), and `INCORRECT_CAPTCHA_TYPE` is surfaced. Also extends `getSessionRecordBySessionId`'s projection to include `captchaType` (previously dropped, which would have made every peek look like a mismatch).
- 8986976: feat(provider): return compiled source in getAllDecisionMachines so the live code on each provider is auditable in a single call
- 970bca2: feat(provider): record the page URL a frictionless session originated from and require it
  
  The frictionless client now reports the page it was rendered on (built from `window.location.origin + pathname`) in the challenge request, and the provider stores it on the session as `currentUrl`. The value is reduced to scheme + host + path on both the client and the provider (`sanitisePageUrl`): the query string, fragment and any embedded `user:pass@` credentials are stripped so URL-borne secrets (tokens, reset codes, session ids) are never persisted. A session whose request carries no usable page URL is treated as a bot signal and forced down the image-captcha path (`FrictionlessReason.MISSING_CURRENT_URL`).
- Updated dependencies [3e0ef08]
- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/database@3.15.3
  - @prosopo/types@4.9.1
  - @prosopo/types-database@4.11.2
  - @prosopo/util@3.3.3
  - @prosopo/api@3.5.7
  - @prosopo/env@3.6.3
  - @prosopo/api-express-router@3.1.34
  - @prosopo/common@3.1.42
  - @prosopo/datasets@3.1.42
  - @prosopo/ipinfo@0.2.28
  - @prosopo/keyring@2.9.48
  - @prosopo/load-balancer@2.10.2
  - @prosopo/types-env@2.10.2
  - @prosopo/user-access-policy@3.10.10
  - @prosopo/logger@2.0.1
  - @prosopo/api-route@2.6.50
  - @prosopo/redis-client@1.0.27

## 4.13.1
### Patch Changes

- ec363e9: fix(provider): resolve origin sessionId to escalation when post-PoW route() escalates to image/puzzle
  
  When the decision machine's route() phase escalates the user from PoW to an image/puzzle captcha, `buildEscalation` mints a fresh session — but the originating session has already been consumed by the preceding /captcha/pow request. Widgets that didn't switch to the escalation sessionId on the next /captcha/* call (older bundled SDKs, hand-rolled wrappers, network-retry races, tab races) landed on NO_SESSION_FOUND. Production deploy of R1/R2 escalations at 18:39 UTC caused a 4.6× spike in CAPTCHA.NO_SESSION_FOUND (363/hr → 1,668/hr); rate dropped immediately once the routing artifact was deleted.
  
  Records an origin → escalation sessionId mapping in Redis at the moment `buildEscalation` creates the new session. On the next /captcha/* request, `isValidRequest` falls back to that mapping when `checkAndRemoveSession` returns null for the supplied sessionId, then invalidates the mapping (single-use). When Redis is unavailable the escalation still returns to the client unchanged — those deployments accept the widget must handle the new sessionId on its own.
- Updated dependencies [ec363e9]
  - @prosopo/database@3.15.2
  - @prosopo/env@3.6.2
  - @prosopo/api-express-router@3.1.33

## 4.13.0
### Minor Changes

- 1111ff2: Add a Prometheus `/metrics` endpoint to the provider/pronode API and instrument the captcha pipeline with a full metrics suite via `prom-client`. The endpoint is served on the existing internal API port (added to `PublicApiPaths`), gated by `PROSOPO_METRICS_ENABLED` (default on), and scraped by Vector over the internal docker network.
  
  Exposes: HTTP request counts/durations by route/method/status; captcha issued and verify outcomes by type/result/source; frictionless routing decisions; bot-score distribution and triggered detectors; blocked-request, domain-validation and spam-email outcomes; maintenance-mode and redis-readiness gauges; and default Node process metrics. High-cardinality identifiers (site key, user, IP, session) are kept out of labels and remain in the structured logs.
- 6a7b122: Allow a client to send a captcha verify request to any pronode: a provider that did not issue the token now forwards the verification to the issuing provider (decoded from the token's providerUrl, SSRF-guarded against the known provider list) and returns its response, mirroring the AWS Lambda verify endpoint. Falls back to local verification when this node is the issuer, the provider list can't be loaded, or the issuer can't be determined.

### Patch Changes

- f643912: Admin endpoints now narrow req.logger with a subscope instead of creating a fresh logger, preserving request context (requestId, user, siteKey) in all admin endpoint logs.
- a444abe: chore(deps): bump uuid from 14.0.0 to 14.0.1
- 9cf7204: chore(deps): bump uuid from 11.1.0 to 14.0.0 in /packages/provider
- 5b0dea0: chore(deps-dev): bump vitest from 3.2.4 to 3.2.6 in /packages/provider
- c9de110: Frictionless: honour an active user access policy on the session-dedup fast path. A reused session whose captchaType conflicts with the policy — e.g. an IP rate-limit rule (`IP_HIGH_REQUEST_RATE_SIMPLE`) forcing `image` over a previously-cached `pow` session — was served as-is and then hard-rejected at the `/captcha/{type}` gate with `INCORRECT_CAPTCHA_TYPE`, breaking the widget. The dedup branch now re-checks the policy, and on conflict evicts the stale session and falls through so the access policy (or decision machine) selects the correct captcha type.
- 2defea0: Add JA4 unit coverage for the empty-SNI 'd' flag and a GREASE-lookalike cipher that must be counted and hashed.
- 411aed2: Replace `read-tls-client-hello` with a spec-compliant JA4 implementation.
  
  Drops the external dependency and adds `packages/provider/src/api/ja4.ts`, a
  self-contained JA4 parser that matches the Rust/AWS-Lambda reference:
  
  - TLS 1.3 detection: parses the `supported_versions` extension body to pick
    the highest non-GREASE version, instead of assuming `"13"` on extension presence
  - Single-byte ALPN: uses `"0"` for the missing last position (e.g. `"h"` → `"h0"`)
  - Non-alphanumeric ALPN bytes: rendered as 2-char lowercase hex (e.g. `"/"` → `"2f"`)
  - Validates that cipher-suite length is even; throws `Ja4ParseError` if not
  - Parses `Buffer` directly — no `Readable` stream wrapping required
- 30b198b: Use child loggers (Logger.with) to bind request/challenge context once instead of repeating it in every log data block.
- 11f1e8c: Replace vague logger scopes (empty strings, import.meta.url, generic "CLI") with structured colon-delimited names following the convention package:subsystem:action.
- c672cd7: Return `403 Forbidden` (was `401 Unauthorized`) for requests denied by the
  blocklist / access-policy block middleware. The client isn't lacking
  credentials — it is denied access — so 403 is the correct status. The response
  body changes from `{ "error": "Unauthorized" }` to `{ "error": "Forbidden" }`.
- 7a2bc13: Forward synchronous validation throws in captcha route handlers to Express's error handler. `validateSiteKey`/`validateAddr` throw `ProsopoApiError` synchronously inside the async captcha handlers, but the route wiring invoked the handler without awaiting or attaching a `.catch`, so Express 4 never observed the rejected promise and the request hung instead of returning the intended 4xx response. Each handler is now wrapped in an `asyncHandler` adapter that forwards any rejection to `next(err)`.
- b166037: fix(provider): length-bound and sanitise request inputs across the provider API endpoints.
  
  - Add shared zod helpers in `@prosopo/types` (`INPUT_LIMITS`, `boundedString`, `safeText`, `safeLine`): every request string field is now length-bounded, and human freetext additionally rejects control characters (null bytes etc.). Typing fields as strings already blocks Mongo operator injection; the control-character rejection covers the remaining log/header-injection vectors.
  - Apply the helpers across the provider request schemas (image/pow/puzzle captcha challenge & solution bodies, frictionless challenge, server verify, DNS event ingestion, sitekey register/remove, detector-key and decision-machine admin bodies, and the spam-email check). Tokens, signatures, behavioural/simd readings and decision-machine source get generous caps; accounts/site-keys/hashes/ids get tight ones.
  
  - Lower the provider API body-parser cap from 50 MB to 1 MB (`express.json` in `startProviderApi.ts`) as a coarse oversized-payload backstop before parsing.
  
  Email and IP fields are treated as length-bounded strings (email keeps its existing format check where present).
- d3cc224: Return 400 (CAPTCHA.PARSE_ERROR) instead of 500 for a malformed checkSpamEmail request body
- Replace `import.meta.url`-derived logger scopes with stable, kebab-case service
  names (e.g. `provider:admin:dns-event`, `client-example-server:app`) so
  `PROSOPO_LOG_LEVEL` directive matching is deterministic across builds.
- Updated dependencies [dfb0c53]
- Updated dependencies [a444abe]
- Updated dependencies [8c8898d]
- Updated dependencies [7ebb78f]
- Updated dependencies [7daea2e]
- Updated dependencies [b9f5eca]
- Updated dependencies [849af99]
- Updated dependencies [48612cd]
- Updated dependencies [a5ba27b]
- Updated dependencies [d1fbde3]
- Updated dependencies [9fe3c06]
- Updated dependencies [948d36b]
- Updated dependencies [41e0e11]
- Updated dependencies [11f1e8c]
- Updated dependencies [3c80664]
- Updated dependencies [a26e9d0]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
- Updated dependencies [6a7b122]
  - @prosopo/common@3.1.41
  - @prosopo/api-express-router@3.1.32
  - @prosopo/logger@2.0.0
  - @prosopo/user-access-policy@3.10.9
  - @prosopo/util-crypto@13.5.30
  - @prosopo/util@3.3.2
  - @prosopo/types-env@2.10.1
  - @prosopo/database@3.15.1
  - @prosopo/datasets@3.1.41
  - @prosopo/types@4.9.0
  - @prosopo/api@3.5.6
  - @prosopo/load-balancer@2.10.1
  - @prosopo/api-route@2.6.49
  - @prosopo/env@3.6.1
  - @prosopo/ipinfo@0.2.27
  - @prosopo/keyring@2.9.47
  - @prosopo/redis-client@1.0.26
  - @prosopo/types-database@4.11.1

## 4.12.0
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

- 1bb2bb1: fix(provider): defensive autoBan re-check inside access-policy path
  
  `runDecisionMachine` already re-evaluates `autoBanScoreThreshold` after the
  webView / timestamp / unverifiedHost score bumps (#2738). `handleAccessPolicy`
  runs *before* `runDecisionMachine` and applies its own
  `scoreIncreaseAccessPolicy` bump, but for non-block policies it short-circuits
  straight to `sendImageCaptcha` / `sendPowCaptcha` / `sendPuzzleCaptcha` —
  bypassing the downstream autoBan check. Close that gap by re-evaluating the
  threshold inside `handleAccessPolicy` right after the bump.
  
  No live traffic was observed hitting this path; this is a defensive close,
  not a fix for an active incident.
- Updated dependencies [12cd0a6]
- Updated dependencies [12cd0a6]
  - @prosopo/load-balancer@2.10.0
  - @prosopo/api@3.5.5
  - @prosopo/types@4.8.0
  - @prosopo/types-database@4.11.0
  - @prosopo/types-env@2.10.0
  - @prosopo/database@3.15.0
  - @prosopo/env@3.6.0
  - @prosopo/api-express-router@3.1.31
  - @prosopo/datasets@3.1.40
  - @prosopo/ipinfo@0.2.26
  - @prosopo/keyring@2.9.46
  - @prosopo/user-access-policy@3.10.8

## 4.11.6
### Patch Changes

- bb98af1: Add `DecisionMachineKind` (`routing` | `decision`) to separate routing and decision artifacts on the same provider.
  
  - New `DecisionMachineKind` enum in `@prosopo/types`.
  - `DecisionMachineArtifact` and the Mongoose `DecisionMachineArtifactRecordSchema` gain an optional `kind` field; the unique compound index becomes `(scope, dappAccount, kind)` so a routing machine and a decision machine can coexist for the same scope/dapp.
  - `ProviderApi.updateDecisionMachine` accepts an optional `kind` 10th arg; the `apiUpdateDecisionMachineEndpoint` admin handler reads `decisionMachineKind` from the request body and forwards it.
  - `ClientTaskManager.updateDecisionMachine` and the artifact-listing returns include `kind`.
  - `ProviderDatabase.getDecisionMachineArtifact` filters by `kind` when supplied; `upsertDecisionMachineArtifact` defaults missing `kind` to `Routing` for backward compatibility on existing rows.
  - `DecisionMachineRunner` keys its in-memory cache by `(scope, kind, dappAccount)` and selects the appropriate artifact for `runDecisionMachine` (kind=`decision`), `runRoutingMachine` (kind=`routing`) and `runCounterMachine` (kind=`routing`).
  - `DecisionMachineArtifactRecordSchema.captchaType` enum now includes `CaptchaType.puzzle` alongside `pow`/`image`.
- d50e7d8: chore(deps-dev): bump undici from 5.29.0 to 6.27.0
- 77b7c66: chore(deps-dev): bump undici from 5.29.0 to 6.27.0 in /packages/provider
- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4
  - @prosopo/types-database@4.10.7
  - @prosopo/database@3.14.7
  - @prosopo/api@3.5.4
  - @prosopo/api-express-router@3.1.30
  - @prosopo/datasets@3.1.39
  - @prosopo/env@3.5.20
  - @prosopo/ipinfo@0.2.25
  - @prosopo/keyring@2.9.45
  - @prosopo/load-balancer@2.9.21
  - @prosopo/types-env@2.9.29
  - @prosopo/user-access-policy@3.10.7

## 4.11.5
### Patch Changes

- 89ab6fc: Extend verify-phase `DecisionMachineInput` with the session-derived fields the internal scorer/router already uses: `score`, `threshold`, `scoreComponents`, `decryptedHeadHash`, `userSitekeyIpHash`, `providerSelectEntropy`, `simdReadings`, `frictionlessReason`, `ruleType`, `webView`, `iFrame`. All fields are optional; existing decision-machine artifacts continue to work. Populates the new fields from `sessionRecord` at the three verify call sites (`powTasks`, `imgCaptchaTasks`, `puzzleTasks`).
  
  Also move the `autoBanScoreThreshold` check in `runDecisionMachine` to after all score-based penalties (webView, oldTimestamp, unverifiedHost) are applied. Previously the check ran against the pre-penalty score (`baseBotScore + lScore`), meaning thresholds above 1.0 were unreachable for clients whose detector saturates at 1.0 even when the post-penalty sum (the value the bot-score-above-threshold branch sees) comfortably exceeded the operator-set threshold. The check now operates on the full scored sum, matching the semantic operators expect from an "auto-ban threshold" knob. UA-mismatch and context-aware short-circuits still run first since neither touches the score.
- 0f3750b: Add optional `entropyMathRandomFingerprint`, `entropyCryptoFingerprint`, `entropyWallClockOffsetMs` and `entropyMathRandomFirst` fields on `Session` (Zod + Mongoose) and the frictionless `decryptPayload` → `setSessionParams` → `createSession` chain. Sparse compound index `{ siteKey, entropyMathRandomFingerprint, createdAt: -1 }` for query support.
- 281c62a: Convert the `clientSettingsPersistence` integration test's `trafficFilter` assertion from a single `toMatchObject` to per-field `expect` calls. Matches the convention already used for top-level settings fields so a future regression that drops one of the trafficFilter sub-fields will surface the specific field name in the failure rather than dumping the whole nested object diff.
- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/types-database@4.10.6
  - @prosopo/api@3.5.3
  - @prosopo/api-express-router@3.1.29
  - @prosopo/database@3.14.6
  - @prosopo/datasets@3.1.38
  - @prosopo/env@3.5.19
  - @prosopo/ipinfo@0.2.24
  - @prosopo/keyring@2.9.44
  - @prosopo/load-balancer@2.9.20
  - @prosopo/types-env@2.9.28
  - @prosopo/user-access-policy@3.10.6

## 4.11.4
### Patch Changes

- e89860e: Add an indexed `type` field on the access-rules Redis index and a `blockOnly` filter on `findRules`. The request-time block middleware and the verify-time hard-block check now pre-filter the candidate pool to Block rules at the Redis layer, so dense Restrict / routing-Block populations can no longer push hard-block rules past the server-side ranking cap. Schema rehash triggers automatic index recreate on next provider start.
- edcd450: Validate salt-encoded coords in PoW and puzzle verification and add a `CAPTCHA_INVALID_SALT` result reason. Invalid input now produces a disapproval rather than a partial write.
- 5295c4b: Traffic-filter `datacenterNameAllowlist` now matches `datacenterName`, `providerName`, or `asnOrganization` (was: `datacenterName` only). Lets the allowlist reach IPs where upstream sets `is_datacenter: true` without populating `datacenter.datacenter`.
  
  New opt-in `trafficFilter.skipExtrasOnValidDnsPath` (default `false`): when on and `dnsEvent.pathValid === true`, skip the filter evaluation on the DNS peer and resolver IPs.
- Updated dependencies [e89860e]
- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/user-access-policy@3.10.5
  - @prosopo/util@3.3.1
  - @prosopo/database@3.14.5
  - @prosopo/types@4.7.2
  - @prosopo/locale@3.2.5
  - @prosopo/types-database@4.10.5
  - @prosopo/datasets@3.1.37
  - @prosopo/keyring@2.9.43
  - @prosopo/logger@1.0.4
  - @prosopo/env@3.5.18
  - @prosopo/api@3.5.2
  - @prosopo/api-express-router@3.1.28
  - @prosopo/common@3.1.40
  - @prosopo/ipinfo@0.2.23
  - @prosopo/load-balancer@2.9.19
  - @prosopo/types-env@2.9.27
  - @prosopo/api-route@2.6.48
  - @prosopo/redis-client@1.0.25

## 4.11.3
### Patch Changes

- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1
  - @prosopo/api@3.5.1
  - @prosopo/api-express-router@3.1.27
  - @prosopo/database@3.14.4
  - @prosopo/datasets@3.1.36
  - @prosopo/env@3.5.17
  - @prosopo/ipinfo@0.2.22
  - @prosopo/keyring@2.9.42
  - @prosopo/load-balancer@2.9.18
  - @prosopo/types-database@4.10.4
  - @prosopo/types-env@2.9.26
  - @prosopo/user-access-policy@3.10.4

## 4.11.2
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
- dde23e8: Internal bot-detection signal improvements.
- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/ipinfo@0.2.21
  - @prosopo/types@4.7.0
  - @prosopo/types-database@4.10.3
  - @prosopo/api@3.5.0
  - @prosopo/env@3.5.16
  - @prosopo/api-express-router@3.1.26
  - @prosopo/database@3.14.3
  - @prosopo/datasets@3.1.35
  - @prosopo/keyring@2.9.41
  - @prosopo/load-balancer@2.9.17
  - @prosopo/types-env@2.9.25
  - @prosopo/user-access-policy@3.10.3

## 4.11.1
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
- Updated dependencies [5f47c42]
  - @prosopo/database@3.14.2
  - @prosopo/types@4.6.1
  - @prosopo/types-database@4.10.2
  - @prosopo/user-access-policy@3.10.2
  - @prosopo/api@3.4.14
  - @prosopo/api-express-router@3.1.25
  - @prosopo/datasets@3.1.34
  - @prosopo/env@3.5.15
  - @prosopo/ipinfo@0.2.20
  - @prosopo/keyring@2.9.40
  - @prosopo/load-balancer@2.9.16
  - @prosopo/types-env@2.9.24

## 4.11.0
### Minor Changes

- 55b1388: Bit-level granular PoW difficulty via target-threshold check. `solvePoW` (client) and `validateSolution` (server) now compare the hash as a 256-bit big-endian integer against `target = 2^(256 - round(4 * difficulty))`, shared via `targetForDifficulty` / `hashMeetsDifficulty` in `@prosopo/util`. Integer difficulties produce *identical* behaviour to the legacy hex-prefix check (d=4 ≡ 16 leading zero bits ≡ threshold 2^240), so existing clients, configs, anomaly detectors, and stored records are unchanged. Fractional values quantise to bit-level granularity: each 0.25 step ≡ 1 bit ≡ 2× work, so providers can tune d=4.25, d=4.5, d=4.75 to fill the 16× gap between today's d=4 and d=5 — useful for landing on a sensible mobile UX. `powDifficulty` in `ClientSettingsSchema` and `RoutingMachineOutputSchema` drops `.int()`; wire format (nonce as `u32`, difficulty as `number`) is unchanged.

### Patch Changes

- Updated dependencies [55b1388]
- Updated dependencies [44eaebf]
  - @prosopo/util@3.3.0
  - @prosopo/types@4.6.0
  - @prosopo/database@3.14.1
  - @prosopo/types-database@4.10.1
  - @prosopo/datasets@3.1.33
  - @prosopo/keyring@2.9.39
  - @prosopo/logger@1.0.3
  - @prosopo/user-access-policy@3.10.1
  - @prosopo/api@3.4.13
  - @prosopo/api-express-router@3.1.24
  - @prosopo/common@3.1.39
  - @prosopo/env@3.5.14
  - @prosopo/ipinfo@0.2.19
  - @prosopo/load-balancer@2.9.15
  - @prosopo/types-env@2.9.23
  - @prosopo/api-route@2.6.47
  - @prosopo/redis-client@1.0.24

## 4.10.0
### Minor Changes

- 9b91e85: Log + persist access-policy block decisions. When `blockMiddleware` 401s a request, the inspector now emits a structured `"Access policy block"` log line carrying the matched rule's identity (`ruleHash`, `ruleType`, `ruleDescription`, `policyType`) and the request's user-scope (ja4 / ip / userAgent / userId / countryCode / asn), and writes a synthetic `Session` record with `blocked: true`, `deleted: true`, `reason: ACCESS_POLICY_BLOCK`, and the same rule fields surfaced on three new optional columns (`ruleHash`, `ruleType`, `ruleDescription`). Persistence is fire-and-forget and any Mongo failure is swallowed-and-logged so the 401 response is never delayed. The new fields are gated by `blocked: true` so legit sessions stay untouched, and two sparse indexes (`{siteKey, blocked, createdAt}`, `{ruleHash}`) keep the per-rule and per-client block aggregations the Traffic page will query off the existing sessions collection without bloating the index on normal traffic.
- c1c7998: Server-side specificity rank for the access-rule lookup. Strict-match callers (the `blockMiddleware` and the verify-time `checkForHardBlock`) now issue one `FT.AGGREGATE` with `APPLY exists()` for specificity, `APPLY @type == "block"` for the severity tiebreak, `SORTBY @_rank DESC`, and `LIMIT 0 20`. Node receives at most 20 fully-populated rules — no follow-up HGETALL per candidate, no JS-side rank, no silent truncation past the LIMIT (which only applies after Redis has scored every candidate the strict filter returned).
  
  Supersedes both the v3.6.38 regression (`b520cd94c` — FT.AGGREGATE WITHCURSOR materialising ~1190 hashes per request, pegged provider1 at ~125% CPU on pronode10) and the 3.6.38-hotfix1 shape that reverted to FT.SEARCH (re-opened the 1000-candidate silent-truncation bug). The greedy/admin path (`matchingFieldsOnly=false`) keeps the FT.AGGREGATE+CURSOR approach with a generous `GREEDY_MAX_CANDIDATES` cap since those callers do not run on the per-request hot path.
  
  `packages/provider/src/api/blacklistRequestInspector.ts` flips `getPrioritisedAccessRule` to `matchingFieldsOnly: true` to engage the new path. The defensive JS `rankCandidateRules` is kept so any drift between the Redis-side score and the JS semantics surfaces as ordering, not as letting traffic through. New benchmark integration test seeds 10k rules across a realistic specificity distribution and asserts p50 < 80ms / p99 < 250ms over 200 lookups; local measurement is steady at p50 ≈ 20ms, p99 ≈ 24ms.
- c80a05b: Split `solutionTimeout` (challenge issuance → user submission) from `verifiedTimeout` (submission → dapp's /verify call) on `UserSettings`. Historically `verifiedTimeout` gated both windows in `verifyRecency` (at /pow|puzzle/solution submit) and in `serverVerifyPowCaptchaSolution` (at /verify), even though its doc comment only described the latter. Adds `solutionTimeout` to `ClientSettingsSchema` (zod) and `UserSettingsSchema` (mongoose) with `DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT` (60s) as default. `submitPoWCaptchaSolution` and `submitPuzzleCaptchaSolution` now use `solutionTimeout` for the recency check and fall back to `verifiedTimeout` for pre-existing client records so behaviour is preserved until those records are backfilled. The `/verify` path is unchanged. Operators can now tighten `verifiedTimeout` (e.g. 20s) to invalidate stale solutions at verify time without also shrinking the user's solve budget.

### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c1c7998]
- Updated dependencies [c80a05b]
  - @prosopo/database@3.14.0
  - @prosopo/types@4.5.0
  - @prosopo/types-database@4.10.0
  - @prosopo/user-access-policy@3.10.0
  - @prosopo/env@3.5.13
  - @prosopo/api@3.4.12
  - @prosopo/api-express-router@3.1.23
  - @prosopo/datasets@3.1.32
  - @prosopo/ipinfo@0.2.18
  - @prosopo/keyring@2.9.38
  - @prosopo/load-balancer@2.9.14
  - @prosopo/types-env@2.9.22

## 4.9.2
### Patch Changes

- Updated dependencies [b520cd9]
  - @prosopo/user-access-policy@3.9.1
  - @prosopo/database@3.13.12
  - @prosopo/types-database@4.9.2
  - @prosopo/env@3.5.12
  - @prosopo/types-env@2.9.21
  - @prosopo/api-express-router@3.1.22

## 4.9.1
### Patch Changes

- 4da8941: Add `deferToVerify` flag on `AccessPolicy` so a Block policy can skip the request-time `blockMiddleware` (no 401 at the captcha endpoint) and fire instead at the verify step. The behaviour mirrors the existing coords-rule deferral pattern: today the middleware blanks out coords from the userScope, so coords-only rules can only ever match in the verify path. `deferToVerify` is the explicit version of that for other signals (ja4Hash, headersHash, etc.) — useful when you want the attacker to pay the captcha-solving cost and the dApp to silently receive `{verified: false}` instead of the bot's frontend seeing a 401.
  
  Wiring:
  
  - `BlacklistRequestInspector.shouldAbortRequest` filters out matching policies that have `deferToVerify` before picking the top hit. Those policies never short-circuit the middleware.
  - `CaptchaManager.findHardBlockPolicy` widens its matcher: a Block policy now counts as a hard block when it has either no `captchaType` (existing behaviour) **or** `deferToVerify === true`. The check is invoked from `imgCaptchaTasks.dappUserSolution`, `powTasks.serverVerifyPowCaptcha`, and `puzzleTasks.verifyPuzzleCaptchaSolution`, so the deferral applies to all three captcha types.
  - Persistence: `deferToVerify` lands on the mongo `accessPolicySchema` (Boolean) and the zod `accessPolicyInput` (with a string→boolean preprocess so the Redis round-trip works).
  
  Motivating use case: a set of spoofed-JA4 hard-block rules pushed 2026-06-12. Marking those `deferToVerify: true` would still reject the attacker at verify but force them to complete N image captcha rounds and surface behavioural data on the commitment record before the rejection — useful for both telemetry and operator-side friction.
- f69724f: Expose `ipInfo` to the verify-phase decision machine. The frictionless DM already gets the full `IPInfoResponse`; the verify-phase DM was only receiving `countryCode`, so rules that need `isDatacenter`, `isVPN`, `isAbuser`, `asnNumber` etc. couldn't run at submission time.
  
  `DecisionMachineInput` now carries an optional `ipInfo` field (alongside `countryCode`, which is kept for backwards compatibility). The three verify-phase call sites — `powTasks`, `puzzleTasks`, `imgCaptchaTasks` — forward `challengeRecord.ipInfo` / `solution.ipInfo` into the input.
  
  This unblocks rules like:
  ```
  if (input.behavioralDataPacked &&
      !input.behavioralDataPacked.c1.length &&
      !input.behavioralDataPacked.c2.length &&
      !input.behavioralDataPacked.c3.length &&
      input.ipInfo?.isDatacenter) return Deny;
  ```
  which catches the datacenter-class bots (Sparkle, Versatel, OVH) that submit empty `behavioralDataPacked` — observed at 100% empty-bDP across a 21-row Sparkle sample, versus 1–3% in genuine traffic.
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
- 73b9f92: Run the `getMaintenanceMode()` short-circuit before constructing `Tasks` in every captcha and verify handler. The `Tasks` constructor calls `env.getDb()`, which throws synchronously when `env.db` is undefined (the maintenance-mode case), so the existing short-circuits were unreachable and the provider was throwing `db not setup! Please call isReady() first` on every request the moment maintenance mode was toggled on. Also adds a maintenance-mode bypass to `getImageCaptchaChallenge` (empty-captchas response, mirroring the existing `submitImageCaptchaSolution` shape) and `checkSpamEmail` (`isSpam: false`) so those endpoints stay usable while Mongo is unavailable.
- Updated dependencies [70ef67a]
- Updated dependencies [4da8941]
- Updated dependencies [f69724f]
- Updated dependencies [4226c59]
- Updated dependencies [3973078]
  - @prosopo/user-access-policy@3.9.0
  - @prosopo/types@4.4.1
  - @prosopo/database@3.13.11
  - @prosopo/types-database@4.9.1
  - @prosopo/api@3.4.11
  - @prosopo/api-express-router@3.1.21
  - @prosopo/datasets@3.1.31
  - @prosopo/env@3.5.11
  - @prosopo/ipinfo@0.2.17
  - @prosopo/keyring@2.9.37
  - @prosopo/load-balancer@2.9.13
  - @prosopo/types-env@2.9.20

## 4.9.0
### Minor Changes

- bc3813d: Surface dnsEvent observations across the verify and frictionless flows. Each verify path now enriches the session's dnsEvent IPs once and passes the result to the traffic filter, decision machine, IP validation, and usage counters. Adds `scoreComponents.dnsAsymmetry` (Zod + TS interface + mongoose) computed from resolver / peer ipInfo plus path validity, with the score patched onto the session at DNS event ingest time so it weights subsequent reads. Adds `CounterDimension.peerIp` for rate-limit keys keyed on the dnsEvent peer IP.
- f305c37: Extend `checkTrafficFilter` to accept an optional `extraIpInfos` list and apply the same per-rule checks across additional IPs. Each verify path threads `session.dnsEvent` IPs through `resolveTrafficFilterCheck` so its peer / resolver enrichments are evaluated alongside the primary client IP.

### Patch Changes

- 2d66d8e: Image-captcha widget now forwards the trusted checkbox click `(clientX, clientY)` through `manager.start(x, y)`. `Manager.submit` embeds the pair as a 2-number prefix on the first captcha's solution salt. Provider peels the prefix via length math against `solution.length` (no protocol version flag — older clients keep working unchanged) and prepends it as the first entry of `pairs`, which is written to `UserCommitment.coords`. Adds `peelCheckboxPrefix` helper in `pairs.ts` with round-trip unit tests.
- Updated dependencies [2972def]
- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types-database@4.9.0
  - @prosopo/types@4.4.0
  - @prosopo/database@3.13.10
  - @prosopo/types-env@2.9.19
  - @prosopo/api@3.4.10
  - @prosopo/api-express-router@3.1.20
  - @prosopo/datasets@3.1.30
  - @prosopo/env@3.5.10
  - @prosopo/ipinfo@0.2.16
  - @prosopo/keyring@2.9.36
  - @prosopo/load-balancer@2.9.12
  - @prosopo/user-access-policy@3.8.1

## 4.8.1
### Patch Changes

- 8a30164: `checkTrafficFilter` no longer treats VPN traffic that exits from a datacenter IP as datacenter traffic. Commercial VPNs (Mullvad, NordVPN, ProtonVPN, …) all run on cloud providers, so operators who enabled `blockDatacenter` but not `blockVpn` were silently catching VPN end-users they did not intend to block. The datacenter rule is now suppressed when `ipInfo.isVPN` is true and `blockVpn` is false. Closes prosopo/captcha-private#3479.

## 4.8.0
### Minor Changes

- 2f459ce: Collapse the per-request access-rule lookup from 2 × (2^n − 1) Redis `FT.SEARCH` round trips (126 with n=6 user-scope fields) to a single greedy query, with specificity ranking done in JS. Same external semantics — client-scoped rules still outrank global, and a rule with both `ja4Hash` and `ip` constraints is correctly rejected for requests that only match one of them.

### Patch Changes

- 2f459ce: Add `asn` as a user-scope field for access rules. The captcha provider can now block / restrict by Autonomous System Number, matching what the protect/bumblebee tier already supports. ASN is read from `ipInfo.asnNumber` and threaded through `getRequestUserScope` and `checkForHardBlock` at all challenge entry points. Redis index gains a NUMERIC `asn` field with range-syntax lookups.
- Updated dependencies [2f459ce]
  - @prosopo/user-access-policy@3.8.0
  - @prosopo/database@3.13.9
  - @prosopo/types-database@4.8.2
  - @prosopo/env@3.5.9
  - @prosopo/types-env@2.9.18
  - @prosopo/api-express-router@3.1.19

## 4.7.2
### Patch Changes

- b03dad1: Thread `shadowDomPenalty: boolean` from the catcher's encrypted detection payload through `decryptPayload` and persist it on `Session.scoreComponents` so the flag is queryable in Mongo without inferring it from `baseScore=1 ∧ ¬triggeredDetectors`. Field is optional on the wire (position 6); older catcher bundles omit it and `shadowDomPenalty` stays undefined.
- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/types-database@4.8.1
  - @prosopo/env@3.5.8
  - @prosopo/api@3.4.9
  - @prosopo/api-express-router@3.1.18
  - @prosopo/database@3.13.8
  - @prosopo/datasets@3.1.29
  - @prosopo/keyring@2.9.35
  - @prosopo/load-balancer@2.9.11
  - @prosopo/types-env@2.9.17
  - @prosopo/user-access-policy@3.7.12

## 4.7.1
### Patch Changes

- 936e987: Republish under npm trusted publishing.
  
  No runtime change. The v3.6.30 publish landed only a partial slice of the workspace before npm rejected the rest (provenance verification + repository-field mismatch). Cutting a fresh version so every package gets a clean publish under the new OIDC-based workflow with provenance attestations attached.

## 4.7.0
### Minor Changes

- 2392aaf: Integrate the prosopo/dns sidecar against the procaptcha provider.
  
  - New admin endpoint `POST /v1/prosopo/provider/admin/dns/event` ingests batched DNS observation events from the sidecar (auth: admin sr25519 JWT) and merges resolver / peer IPs onto the matching Session record under a new `Session.dnsEvent` field.
  - Frictionless response carries a per-session `dns_url` when the pronode has `DNS_EVENT_SUBZONE` + `DNS_EVENT_HMAC_SECRET` set. The HMAC path mirrors the sidecar's Rust implementation so both sides agree without shared per-request state.
  - The frictionless bundle fires one no-cors GET to `dns_url` on detection completion (fire-and-forget; failures never affect the captcha flow).
  - `dns_url` is included on the `reuse_session` short-circuit path too, not only the new-session path — otherwise repeat visits from the same user/IP/sitekey combination silently dropped the observation hop.
  - Deploy compose entry for the sidecar plus a Caddy `layer4` SNI-passthrough block so the sidecar terminates TLS itself (no Cloudflare token needed). Caddy image must be rebuilt with the `caddy-l4` plugin.

### Patch Changes

- 896243a: Document three known spec deviations in `read-tls-client-hello`'s JA4 implementation.
  
  Adds inline comments to `ja4Middleware.ts` explaining how `calculateJa4FromHelloData`
  differs from the Rust/AWS-Lambda reference: TLS 1.3 detection via extension presence
  rather than content, single-byte ALPN first-char duplication, and ASCII decoding of
  non-alphanumeric ALPN bytes instead of hex encoding.
- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [97cf7bd]
- Updated dependencies [6ca1125]
- Updated dependencies [32a591b]
  - @prosopo/types@4.3.0
  - @prosopo/types-database@4.8.0
  - @prosopo/logger@1.0.2
  - @prosopo/util@3.2.15
  - @prosopo/api@3.4.8
  - @prosopo/api-express-router@3.1.17
  - @prosopo/common@3.1.38
  - @prosopo/database@3.13.7
  - @prosopo/datasets@3.1.28
  - @prosopo/env@3.5.7
  - @prosopo/keyring@2.9.34
  - @prosopo/load-balancer@2.9.10
  - @prosopo/types-env@2.9.16
  - @prosopo/user-access-policy@3.7.11
  - @prosopo/api-route@2.6.46
  - @prosopo/redis-client@1.0.23

## 4.6.3
### Patch Changes

- e7b77e9: fix(provider): replace the honeypot semaphore encoder's lossy flag-emoji cycle with a bijective arrow-pair mapping and morse-style letter/word separators, so the encoded label is recoverable instead of an opaque glyph blob
- 65a7384: test(provider): add a unit test asserting an incorrectly solved image captcha is disapproved (`verified: false`), closing the unit-level gap previously only covered by the integration test

## 4.6.2
### Patch Changes

- d62eb70: Fix provider crash-loop on startup in maintenance mode.
  
  `domainMiddleware` constructed `new Tasks(env)` eagerly at wire-up time, which
  calls `env.getDb()`. In `MAINTENANCE_MODE=true` the DB is intentionally never
  connected (`isReady()` skips the connect), so `getDb()` throws
  `"db not setup! Please call isReady() first"`. That error was unguarded and
  propagated out of `startProviderApi`, crashing the process on every boot and
  leaving the provider in a Docker restart loop.
  
  `Tasks` is now resolved lazily on the first request that actually needs domain
  validation — i.e. only once maintenance mode is off — mirroring the existing
  lazy pattern in `blockMiddleware`. The request handler already short-circuits
  on `getMaintenanceMode()` before touching the DB, so no request path depends on
  the eager construction.
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
  - @prosopo/types-database@4.7.8
  - @prosopo/api@3.4.7
  - @prosopo/api-express-router@3.1.16
  - @prosopo/database@3.13.6
  - @prosopo/datasets@3.1.27
  - @prosopo/env@3.5.6
  - @prosopo/keyring@2.9.33
  - @prosopo/load-balancer@2.9.9
  - @prosopo/types-env@2.9.15
  - @prosopo/user-access-policy@3.7.10

## 4.6.1
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.
- Updated dependencies [0fd81af]
  - @prosopo/api-express-router@3.1.15
  - @prosopo/api-route@2.6.45
  - @prosopo/common@3.1.37
  - @prosopo/database@3.13.5
  - @prosopo/datasets@3.1.26
  - @prosopo/env@3.5.5
  - @prosopo/logger@1.0.1
  - @prosopo/redis-client@1.0.22
  - @prosopo/types-database@4.7.7
  - @prosopo/types-env@2.9.14
  - @prosopo/user-access-policy@3.7.9
  - @prosopo/keyring@2.9.32
  - @prosopo/load-balancer@2.9.8

## 4.6.0
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

- 4d9923e: test(provider): integration test asserting every IUserSettings field round-trips through Mongo
  
  Registers a site key with a fully-populated `IUserSettings` (every field set, including the new `storeMetadata` and the existing nested `contextAware` / `ipValidationRules` / `spamFilter` / `trafficFilter` sub-documents), reads the record back from Mongo via the real Mongoose write/read path, and asserts each top-level and nested field survived. This is the regression test class that would have caught the `autoBanScoreThreshold` Mongoose-strict-mode drop on the original PR.
  
  While adding the test it caught another field that was in zod `ClientSettingsSchema` but missing from the Mongoose `UserSettingsSchema`: `puzzleTolerance`. The fix is bundled here — adds `puzzleTolerance: { type: Number, required: false }` to `UserSettingsSchema` so it actually persists.
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
- Updated dependencies [cdbc5ed]
- Updated dependencies [4d9923e]
- Updated dependencies [20cae63]
- Updated dependencies [b2e1a5d]
- Updated dependencies [4d9923e]
  - @prosopo/types-database@4.7.6
  - @prosopo/types@4.2.0
  - @prosopo/database@3.13.4
  - @prosopo/types-env@2.9.13
  - @prosopo/api@3.4.6
  - @prosopo/api-express-router@3.1.14
  - @prosopo/datasets@3.1.25
  - @prosopo/env@3.5.4
  - @prosopo/keyring@2.9.31
  - @prosopo/load-balancer@2.9.7
  - @prosopo/user-access-policy@3.7.8

## 4.5.3
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
  - @prosopo/database@3.13.3
  - @prosopo/api@3.4.5
  - @prosopo/api-express-router@3.1.13
  - @prosopo/datasets@3.1.24
  - @prosopo/env@3.5.3
  - @prosopo/keyring@2.9.30
  - @prosopo/load-balancer@2.9.6
  - @prosopo/types-env@2.9.12
  - @prosopo/user-access-policy@3.7.7

## 4.5.2
### Patch Changes

- 6567ce0: feat(provider): allow Google Translate proxy domains through the domain check middleware
  
  Google Translate proxies a site under `<encoded>.translate.goog` (e.g.
  `prosopo-io.translate.goog`), encoding `.` as `-` and `-` as `--`. With the
  previous implementation the proxied host never matched a site's allowed
  domains and the captcha widget broke on translated pages.
  
  Add `decodeGoogleTranslateHost` to `@prosopo/util` which reverses the
  encoding, and update the provider's `domainMiddleware` so that when the
  request origin is a `*.translate.goog` URL it also tries the decoded
  origin against the site's allowed domains.
  
  Closes #2585.
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
- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
- Updated dependencies [7e8cbb7]
  - @prosopo/util@3.2.14
  - @prosopo/types@4.1.3
  - @prosopo/locale@3.2.4
  - @prosopo/types-database@4.7.4
  - @prosopo/database@3.13.2
  - @prosopo/datasets@3.1.23
  - @prosopo/keyring@2.9.29
  - @prosopo/user-access-policy@3.7.6
  - @prosopo/api@3.4.4
  - @prosopo/api-express-router@3.1.12
  - @prosopo/common@3.1.36
  - @prosopo/env@3.5.2
  - @prosopo/load-balancer@2.9.5
  - @prosopo/types-env@2.9.11
  - @prosopo/api-route@2.6.44
  - @prosopo/redis-client@1.0.21

## 4.5.1
### Patch Changes

- a780f1c: Stop logging an error per request when a decision machine has no `route` export.
  
  PR #2543 added a routing pre-phase that calls `route()` on whichever decision
  machine is selected for the dapp. The runner's export lookup only treats
  `module.exports = fn` as a default for `decide`/`default`, so decide-only
  machines (the in-prod shape: a bare default function) caused `route()` to
  throw `Decision machine must export one of: route` on every verify request.
  
  Behaviour was already correct — the caller catches and falls back to the
  baseline — but the per-request error log was noisy. Pass `optional: true`
  when looking up the `route` export so a missing one returns `undefined`
  silently, matching how `requiredCounters` is already handled. Schema
  validation failures, throws, and timeouts continue to log an error.
- Updated dependencies [72a1218]
  - @prosopo/util@3.2.13
  - @prosopo/database@3.13.1
  - @prosopo/datasets@3.1.22
  - @prosopo/keyring@2.9.28
  - @prosopo/types@4.1.2
  - @prosopo/user-access-policy@3.7.5
  - @prosopo/env@3.5.1
  - @prosopo/types-env@2.9.10
  - @prosopo/api@3.4.3
  - @prosopo/api-express-router@3.1.11
  - @prosopo/load-balancer@2.9.4
  - @prosopo/types-database@4.7.3

## 4.5.0
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
  - @prosopo/locale@3.2.3
  - @prosopo/env@3.5.0
  - @prosopo/database@3.13.0
  - @prosopo/api@3.4.2
  - @prosopo/types@4.1.1
  - @prosopo/api-express-router@3.1.10
  - @prosopo/common@3.1.35
  - @prosopo/types-database@4.7.2
  - @prosopo/user-access-policy@3.7.4
  - @prosopo/datasets@3.1.21
  - @prosopo/keyring@2.9.27
  - @prosopo/load-balancer@2.9.3
  - @prosopo/types-env@2.9.9
  - @prosopo/api-route@2.6.43
  - @prosopo/redis-client@1.0.20

## 4.4.2
### Patch Changes

- f4001e8: Fix `/captcha/{type}` endpoints looping with "No session found" after a
  session has been consumed: the hash → sessionId mapping
  (`cache:session:hash:{userSitekeyIpHash}`) is now invalidated alongside
  the sessionId cache, and both invalidations are awaited so a concurrent
  `patchCachedSession` (e.g. puzzle solution submission) can no longer
  re-populate the cache between consume and response. Previously the
  hash mapping outlived the session for up to its 1-hour TTL, so
  `/frictionless` kept handing the dead sessionId back to the client.
  
  Fix the configured-image short-circuit in `/frictionless` to use the
  normal solved count capped by `imageMaxRounds`, matching every other
  image branch in the file. Previously it used `imageMaxRounds`
  (default 32) as the count rather than as a cap, so any site key
  configured with `captchaType: image` punished every visitor with 32
  rounds regardless of bot signals.
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
- 0832606: Add integration test asserting an incorrectly solved image captcha is marked as disapproved
- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/database@3.12.1
  - @prosopo/api@3.4.1
  - @prosopo/api-express-router@3.1.9
  - @prosopo/datasets@3.1.20
  - @prosopo/env@3.4.9
  - @prosopo/keyring@2.9.26
  - @prosopo/load-balancer@2.9.2
  - @prosopo/types-database@4.7.1
  - @prosopo/types-env@2.9.8
  - @prosopo/user-access-policy@3.7.3

## 4.4.1
### Patch Changes

- bd9f284: Add an integration test asserting that a correct image captcha solution
  submitted after the time limit is disapproved by the provider and verified as
  disapproved by the dapp.

## 4.4.0
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
- 8bb7286: Move `captchaType` from client (`data-captcha-type` / render-options prop)
  to a server-side site-key setting; the bundle now calls `/frictionless`
  for all flows. Renames the bundle's universal mount component from
  `FrictionlessCaptcha` to `BundleCaptcha` to reflect that it is no longer
  frictionless-specific — the server decides which concrete challenge type
  to render.

### Patch Changes

- f9ea09d: Stop re-looking up the IP in `checkTrafficFilter` — read `record.ipInfo` instead
  
  Now that every captcha record carries the full `IPInfoResponse` (written by `ipInfoMiddleware` at request time), `checkTrafficFilter` no longer needs to call `ipInfoService.lookup(ip)` on the verify path. The function takes an `IPInfoResponse | undefined` directly and is no longer async — one fewer sidecar round-trip per verify call.
  
  - `checkTrafficFilter(ip, trafficFilter, ipInfoService, logger)` → `checkTrafficFilter(ipInfo, trafficFilter)`.
  - `serverVerifyPowCaptchaSolution`, `verifyImageCaptchaSolution`, and `serverVerifyPuzzleCaptchaSolution` (newly given a `trafficFilter` parameter to bring it to parity with the other two) read `challengeRecord.ipInfo` / `solution.ipInfo` by default, and only do a fresh `env.ipInfoService.lookup(ip)` when the dapp passed up the end user's current IP via the verify call — that's the "now" IP for filtering, and may differ from the IP that originally requested the captcha.
  - Existing unit tests (`checkTrafficFilter.unit.test.ts`) updated to the new shape; new MongoMemory roundtrip tests in `packages/database/src/tests/integration/ipInfoPersistence.integration.test.ts` prove the three captcha schemas (PoW / Puzzle / UserCommitment) actually persist + retrieve a full IPInfoResponse, and that the `{ ipInfo: { $exists: false } }` backfill query matches records missing the field.
  
  Paired with [captcha-private#3339](https://github.com/prosopo/captcha-private/pull/3339).
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
- 4aae4e6: refactor/provider: dedupe SIMD-readings decrypt+attach boilerplate
  
  The same 20–25-line "decrypt the SIMD readings ciphertext with the
  provider detector keys, strip the timestamp, and persist them to the
  session record" block was repeated six times across the challenge-GET
  endpoints and the submit verifiers. Pulled it into two layered methods
  on `CaptchaManager`:
  
  - `decryptSimdReadingsForAttach(ciphertext)` returns the decoded
    readings or `undefined`. Used by the image-submit path which decodes
    once and reuses the result across several session writes.
  
  - `decryptAndAttachSimdReadingsIfAbsent(sessionId, ciphertext, stage)`
    is a thin wrapper for the common decrypt-then-record case used by the
    three challenge-GETs and the PoW/Puzzle submit verifiers.
  
  Net −69 lines across the 6 callsites (+53 of helper). Behaviour is
  unchanged.
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
- a9a40e9: Always check an IP in traffic filter
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
- 4993813: Standardise provider error logging so every error is queryable via a single
  top-level `err` field, and so the logged value is the locale-stable
  translation key (e.g. `CAPTCHA.NO_SESSION_FOUND`) rather than the translated
  message text (`"No session found"`, `"Aucune session trouvée"`, etc.).
  
  - `ProsopoBaseError.logError()` now emits `{ err: translationKey, data: { errorType, context } }` instead of `{ data: { errorType, errorParams: { error, context } } }`. OpenObserve queries can drop `data_errorparams_error` and `data_errorparams_context_translationmessage`.
  - The redundant `translationMessage` injection into wrapped-error context is removed (it was the source of the locale-variant strings).
  - `NativeLogger.unpackError()` prefers `e.translationKey` over `e.message` when surfacing an error via `logger.error(() => ({ err }))`, so catch-and-log sites are standardised automatically.
  - Removed two `console.error` calls in `verify.ts` and an accidental debug `console.log(JSON.stringify(effectiveRules, null, 2))` in `util.ts` that were both bypassing `req.logger` (no `requestId`, and in the JSON dump case exploding into ~20 separate log entries per call).
  - HTTP response shape is unchanged: `unwrapError()` still uses `i18n.t(err.message)` for the response body, and `jsonError.key` still carries the translation key for clients.
- Updated dependencies [f9ea09d]
- Updated dependencies [3c0be68]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4aae4e6]
- Updated dependencies [d865319]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4993813]
- Updated dependencies [72a0483]
  - @prosopo/database@3.12.0
  - @prosopo/types@4.0.0
  - @prosopo/api@3.4.0
  - @prosopo/types-database@4.7.0
  - @prosopo/load-balancer@2.9.1
  - @prosopo/locale@3.2.2
  - @prosopo/util@3.2.12
  - @prosopo/keyring@2.9.25
  - @prosopo/common@3.1.34
  - @prosopo/user-access-policy@3.7.2
  - @prosopo/env@3.4.8
  - @prosopo/api-express-router@3.1.8
  - @prosopo/datasets@3.1.19
  - @prosopo/types-env@2.9.7
  - @prosopo/api-route@2.6.42
  - @prosopo/redis-client@1.0.19

## 4.3.0
### Minor Changes

- 33a6c57: Provider speed ups

### Patch Changes

- 819ed95: Adding invisible mode to session data
- 1b35548: Adding maintenance mode check at start of domain middleware
- Updated dependencies [819ed95]
- Updated dependencies [33a6c57]
  - @prosopo/types-database@4.6.2
  - @prosopo/types@3.16.1
  - @prosopo/api@3.3.2
  - @prosopo/load-balancer@2.9.0
  - @prosopo/database@3.11.0
  - @prosopo/types-env@2.9.6
  - @prosopo/api-express-router@3.1.7
  - @prosopo/datasets@3.1.18
  - @prosopo/env@3.4.7
  - @prosopo/keyring@2.9.24
  - @prosopo/user-access-policy@3.7.1

## 4.2.1
### Patch Changes

- Updated dependencies [60ba3b1]
  - @prosopo/user-access-policy@3.7.0
  - @prosopo/database@3.10.2
  - @prosopo/types-database@4.6.1
  - @prosopo/env@3.4.6
  - @prosopo/types-env@2.9.5
  - @prosopo/api-express-router@3.1.6

## 4.2.0
### Minor Changes

- 780dcb0: Clear sessions from cache when deleted from db

### Patch Changes

- Updated dependencies [942701b]
  - @prosopo/database@3.10.1
  - @prosopo/env@3.4.5
  - @prosopo/api-express-router@3.1.5

## 4.1.0
### Minor Changes

- 558bc6d: Make sure redis cache works with bigint

## 4.0.0
### Major Changes

- 41c54b0: Redis cache to avoid hitting the database multiple times per API request

### Minor Changes

- f14d645: Fix to catch NaN being passed in as score in sessions
- 74092d0: Stream data back to central for decisions

### Patch Changes

- Updated dependencies [74092d0]
  - @prosopo/types-database@4.6.0
  - @prosopo/database@3.10.0
  - @prosopo/types-env@2.9.4
  - @prosopo/env@3.4.4
  - @prosopo/api-express-router@3.1.4

## 3.24.0
### Minor Changes

- 99dfb44: Pass back reason via verify calls

### Patch Changes

- f6a4402: API endpoint for removing site keys
- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types-database@4.5.3
  - @prosopo/database@3.9.18
  - @prosopo/types@3.16.0
  - @prosopo/api@3.3.1
  - @prosopo/types-env@2.9.3
  - @prosopo/env@3.4.3
  - @prosopo/api-express-router@3.1.3
  - @prosopo/datasets@3.1.17
  - @prosopo/keyring@2.9.23
  - @prosopo/load-balancer@2.8.40
  - @prosopo/user-access-policy@3.6.24

## 3.23.2
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0
  - @prosopo/api@3.3.0
  - @prosopo/api-express-router@3.1.2
  - @prosopo/database@3.9.17
  - @prosopo/datasets@3.1.16
  - @prosopo/env@3.4.2
  - @prosopo/keyring@2.9.22
  - @prosopo/load-balancer@2.8.39
  - @prosopo/types-database@4.5.2
  - @prosopo/types-env@2.9.2
  - @prosopo/user-access-policy@3.6.23

## 3.23.1
### Patch Changes

- 946a8ba: Abuser score threshold
- 5614814: Small config changes
- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
- Updated dependencies [b94890c]
  - @prosopo/types-database@4.5.1
  - @prosopo/types@3.14.1
  - @prosopo/locale@3.2.1
  - @prosopo/database@3.9.16
  - @prosopo/types-env@2.9.1
  - @prosopo/api@3.2.11
  - @prosopo/api-express-router@3.1.1
  - @prosopo/common@3.1.33
  - @prosopo/datasets@3.1.15
  - @prosopo/env@3.4.1
  - @prosopo/keyring@2.9.21
  - @prosopo/load-balancer@2.8.38
  - @prosopo/user-access-policy@3.6.22
  - @prosopo/api-route@2.6.41

## 3.23.0
### Minor Changes

- 42650db: Add better spam rules and move ipinfo service to local instead of external

### Patch Changes

- fc514dd: ability to block different types of traffic
- Updated dependencies [fc514dd]
- Updated dependencies [7be39c4]
- Updated dependencies [42650db]
  - @prosopo/types-database@4.5.0
  - @prosopo/locale@3.2.0
  - @prosopo/types@3.14.0
  - @prosopo/api@3.2.10
  - @prosopo/api-express-router@3.1.0
  - @prosopo/types-env@2.9.0
  - @prosopo/env@3.4.0
  - @prosopo/database@3.9.15
  - @prosopo/common@3.1.32
  - @prosopo/datasets@3.1.14
  - @prosopo/keyring@2.9.20
  - @prosopo/load-balancer@2.8.37
  - @prosopo/user-access-policy@3.6.21
  - @prosopo/api-route@2.6.40

## 3.22.4
### Patch Changes

- fe5f0f9: Fixing flaky image captcha test
- Updated dependencies [4a9c518]
  - @prosopo/common@3.1.31
  - @prosopo/api-express-router@3.0.70
  - @prosopo/api-route@2.6.39
  - @prosopo/database@3.9.14
  - @prosopo/datasets@3.1.13
  - @prosopo/env@3.3.15
  - @prosopo/keyring@2.9.19
  - @prosopo/load-balancer@2.8.36
  - @prosopo/types-database@4.4.14
  - @prosopo/types-env@2.8.15
  - @prosopo/user-access-policy@3.6.20

## 3.22.3
### Patch Changes

- Updated dependencies [a25dffa]
  - @prosopo/util@3.2.11
  - @prosopo/database@3.9.13
  - @prosopo/datasets@3.1.12
  - @prosopo/keyring@2.9.18
  - @prosopo/types@3.13.3
  - @prosopo/user-access-policy@3.6.19
  - @prosopo/env@3.3.14
  - @prosopo/types-env@2.8.14
  - @prosopo/api@3.2.9
  - @prosopo/api-express-router@3.0.69
  - @prosopo/load-balancer@2.8.35
  - @prosopo/types-database@4.4.13

## 3.22.2
### Patch Changes

- 346edd7: Fix exports for browser
- Updated dependencies [346edd7]
  - @prosopo/util@3.2.10
  - @prosopo/database@3.9.12
  - @prosopo/datasets@3.1.11
  - @prosopo/keyring@2.9.17
  - @prosopo/types@3.13.2
  - @prosopo/user-access-policy@3.6.18
  - @prosopo/env@3.3.13
  - @prosopo/types-env@2.8.13
  - @prosopo/api@3.2.8
  - @prosopo/api-express-router@3.0.68
  - @prosopo/load-balancer@2.8.34
  - @prosopo/types-database@4.4.12

## 3.22.1
### Patch Changes

- Updated dependencies [22bfee7]
  - @prosopo/util@3.2.9
  - @prosopo/database@3.9.11
  - @prosopo/datasets@3.1.10
  - @prosopo/keyring@2.9.16
  - @prosopo/types@3.13.1
  - @prosopo/user-access-policy@3.6.17
  - @prosopo/env@3.3.12
  - @prosopo/types-env@2.8.12
  - @prosopo/api@3.2.7
  - @prosopo/api-express-router@3.0.67
  - @prosopo/load-balancer@2.8.33
  - @prosopo/types-database@4.4.11

## 3.22.0
### Minor Changes

- e6d9553: Add `registerSiteKeys` bulk endpoint (`POST /v1/prosopo/provider/admin/sitekeys/register`) that accepts an array of site key records, allowing multiple client records to be registered in a single request.

### Patch Changes

- Updated dependencies [e0fb3d6]
- Updated dependencies [e6d9553]
- Updated dependencies [f3f23e3]
  - @prosopo/util@3.2.8
  - @prosopo/types@3.13.0
  - @prosopo/database@3.9.10
  - @prosopo/datasets@3.1.9
  - @prosopo/keyring@2.9.15
  - @prosopo/user-access-policy@3.6.16
  - @prosopo/api@3.2.6
  - @prosopo/api-express-router@3.0.66
  - @prosopo/env@3.3.11
  - @prosopo/load-balancer@2.8.32
  - @prosopo/types-database@4.4.10
  - @prosopo/types-env@2.8.11

## 3.21.4
### Patch Changes

- 730c61e: Speed up captcha
- e1ea65f: Better spam email domain checking
- c316257: Adding sync fo sessions wrt captcha status
- Updated dependencies [730c61e]
- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/load-balancer@2.8.31
  - @prosopo/types@3.12.3
  - @prosopo/types-database@4.4.9
  - @prosopo/database@3.9.9
  - @prosopo/util@3.2.7
  - @prosopo/api@3.2.5
  - @prosopo/api-express-router@3.0.65
  - @prosopo/datasets@3.1.8
  - @prosopo/env@3.3.10
  - @prosopo/keyring@2.9.14
  - @prosopo/types-env@2.8.10
  - @prosopo/user-access-policy@3.6.15

## 3.21.3
### Patch Changes

- dbcd098: Fix bug with chrome on ios
- adb89a6: Disposable email checking
- Updated dependencies [adb89a6]
  - @prosopo/types-database@4.4.8
  - @prosopo/database@3.9.8
  - @prosopo/locale@3.1.29
  - @prosopo/types@3.12.2
  - @prosopo/util@3.2.6
  - @prosopo/api@3.2.4
  - @prosopo/types-env@2.8.9
  - @prosopo/env@3.3.9
  - @prosopo/api-express-router@3.0.64
  - @prosopo/common@3.1.30
  - @prosopo/datasets@3.1.7
  - @prosopo/keyring@2.9.13
  - @prosopo/load-balancer@2.8.30
  - @prosopo/user-access-policy@3.6.14
  - @prosopo/api-route@2.6.38

## 3.21.2
### Patch Changes

- f5c8725: Fix bug with chrome on ios

## 3.21.1
### Patch Changes

- a90eb54: We know WHAT happens but we don't know WHY happens
- Updated dependencies [c5ee492]
- Updated dependencies [a90eb54]
  - @prosopo/common@3.1.29
  - @prosopo/types-database@4.4.7
  - @prosopo/types@3.12.1
  - @prosopo/api-express-router@3.0.63
  - @prosopo/api-route@2.6.37
  - @prosopo/database@3.9.7
  - @prosopo/datasets@3.1.6
  - @prosopo/env@3.3.8
  - @prosopo/keyring@2.9.12
  - @prosopo/load-balancer@2.8.29
  - @prosopo/types-env@2.8.8
  - @prosopo/user-access-policy@3.6.13
  - @prosopo/api@3.2.3

## 3.21.0
### Minor Changes

- feaca02: Max image rounds

### Patch Changes

- 759d4e6: Dynamic server secrets for client example server
- 676c5f2: Use HTTPS in developmentwq
- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/load-balancer@2.8.28
  - @prosopo/keyring@2.9.11
  - @prosopo/types@3.12.0
  - @prosopo/env@3.3.7
  - @prosopo/types-env@2.8.7
  - @prosopo/api@3.2.2
  - @prosopo/api-express-router@3.0.62
  - @prosopo/database@3.9.6
  - @prosopo/datasets@3.1.5
  - @prosopo/types-database@4.4.6
  - @prosopo/user-access-policy@3.6.12

## 3.20.4
### Patch Changes

- 8148587: Clustering
- Updated dependencies [8148587]
  - @prosopo/types-database@4.4.5
  - @prosopo/types@3.11.1
  - @prosopo/database@3.9.5
  - @prosopo/types-env@2.8.6
  - @prosopo/api@3.2.1
  - @prosopo/api-express-router@3.0.61
  - @prosopo/datasets@3.1.4
  - @prosopo/env@3.3.6
  - @prosopo/keyring@2.9.10
  - @prosopo/load-balancer@2.8.27
  - @prosopo/user-access-policy@3.6.11

## 3.20.3
### Patch Changes

- 5444635: New ob code

## 3.20.2
### Patch Changes

- 31af9cf: Use correct country code var

## 3.20.1
### Patch Changes

- Updated dependencies [90033e9]
  - @prosopo/types-database@4.4.4
  - @prosopo/database@3.9.4
  - @prosopo/types-env@2.8.5
  - @prosopo/env@3.3.5
  - @prosopo/api-express-router@3.0.60

## 3.20.0
### Minor Changes

- 7f6ffc5: Store behavioural for image challenges

### Patch Changes

- ca7f4ad: Attach site key and user to logger earlier
- Updated dependencies [ca7f4ad]
- Updated dependencies [7f6ffc5]
  - @prosopo/api-express-router@3.0.59
  - @prosopo/types@3.11.0
  - @prosopo/api@3.2.0
  - @prosopo/database@3.9.3
  - @prosopo/datasets@3.1.3
  - @prosopo/env@3.3.4
  - @prosopo/keyring@2.9.9
  - @prosopo/load-balancer@2.8.26
  - @prosopo/types-database@4.4.3
  - @prosopo/types-env@2.8.4
  - @prosopo/user-access-policy@3.6.10

## 3.19.3
### Patch Changes

- bca43e5: catcher updates

## 3.19.2
### Patch Changes

- ce4f831: patch for some mobile devices
- 93fa086: Add decision engine endpoints
- 4de47f5: Catcher update
- Updated dependencies [93fa086]
  - @prosopo/types-database@4.4.2
  - @prosopo/database@3.9.2
  - @prosopo/types@3.10.2
  - @prosopo/api@3.1.49
  - @prosopo/types-env@2.8.3
  - @prosopo/env@3.3.3
  - @prosopo/api-express-router@3.0.58
  - @prosopo/datasets@3.1.2
  - @prosopo/keyring@2.9.8
  - @prosopo/load-balancer@2.8.25
  - @prosopo/user-access-policy@3.6.9

## 3.19.1
### Patch Changes

- cde7550: enhance/frictionless-headers-db-field
- Updated dependencies [cde7550]
  - @prosopo/types-database@4.4.1
  - @prosopo/types@3.10.1
  - @prosopo/database@3.9.1
  - @prosopo/types-env@2.8.2
  - @prosopo/api@3.1.48
  - @prosopo/api-express-router@3.0.57
  - @prosopo/datasets@3.1.1
  - @prosopo/env@3.3.2
  - @prosopo/keyring@2.9.7
  - @prosopo/load-balancer@2.8.24
  - @prosopo/user-access-policy@3.6.8

## 3.19.0
### Minor Changes

- ad6d622: Separate types from mongoose schemas to avoid bundling mongoose in frontend

### Patch Changes

- fa95c5f: zod types for db records
- Updated dependencies [ad6d622]
- Updated dependencies [ced9f41]
- Updated dependencies [fa95c5f]
  - @prosopo/types-database@4.4.0
  - @prosopo/database@3.9.0
  - @prosopo/datasets@3.1.0
  - @prosopo/types@3.10.0
  - @prosopo/types-env@2.8.1
  - @prosopo/env@3.3.1
  - @prosopo/api@3.1.47
  - @prosopo/api-express-router@3.0.56
  - @prosopo/keyring@2.9.6
  - @prosopo/load-balancer@2.8.23
  - @prosopo/user-access-policy@3.6.7

## 3.18.0
### Minor Changes

- ff58a70: Load the geolocation service at startup only

### Patch Changes

- Updated dependencies [ff58a70]
- Updated dependencies [d329e63]
  - @prosopo/types-env@2.8.0
  - @prosopo/types@3.9.0
  - @prosopo/env@3.3.0
  - @prosopo/database@3.8.0
  - @prosopo/api@3.1.46
  - @prosopo/api-express-router@3.0.55
  - @prosopo/datasets@3.0.63
  - @prosopo/keyring@2.9.5
  - @prosopo/load-balancer@2.8.22
  - @prosopo/types-database@4.3.1
  - @prosopo/user-access-policy@3.6.6

## 3.17.0
### Minor Changes

- 3feeea4: Store geolocation. Remove pending image captcha collection

### Patch Changes

- Updated dependencies [3feeea4]
  - @prosopo/types-database@4.3.0
  - @prosopo/database@3.7.0
  - @prosopo/datasets@3.0.62
  - @prosopo/types-env@2.7.66
  - @prosopo/env@3.2.42
  - @prosopo/api-express-router@3.0.54

## 3.16.5
### Patch Changes

- 4c08158: Skip ip validation unit tests
- d2431cd: Allow IP validation rules to be disabled
- Updated dependencies [4c08158]
- Updated dependencies [d2431cd]
  - @prosopo/types-database@4.2.4
  - @prosopo/types@3.8.4
  - @prosopo/database@3.6.12
  - @prosopo/datasets@3.0.61
  - @prosopo/types-env@2.7.65
  - @prosopo/api@3.1.45
  - @prosopo/api-express-router@3.0.53
  - @prosopo/env@3.2.41
  - @prosopo/keyring@2.9.4
  - @prosopo/load-balancer@2.8.21
  - @prosopo/user-access-policy@3.6.5

## 3.16.4
### Patch Changes

- 3a58d06: Don't fail on IP comparison fail

## 3.16.3
### Patch Changes

- 8dad7f3: Implement frictionless blocks
- Updated dependencies [8dad7f3]
  - @prosopo/types-database@4.2.3
  - @prosopo/database@3.6.11
  - @prosopo/datasets@3.0.60
  - @prosopo/types-env@2.7.64
  - @prosopo/env@3.2.40
  - @prosopo/api-express-router@3.0.52

## 3.16.2
### Patch Changes

- 664e5bd: add unit tests
- b19da6d: Shared CLI start fn
- bd6995b: Adding UAP based geoblocking rules
- Updated dependencies [bd6995b]
  - @prosopo/user-access-policy@3.6.4
  - @prosopo/types@3.8.3
  - @prosopo/database@3.6.10
  - @prosopo/types-database@4.2.2
  - @prosopo/api@3.1.44
  - @prosopo/api-express-router@3.0.51
  - @prosopo/datasets@3.0.59
  - @prosopo/env@3.2.39
  - @prosopo/keyring@2.9.3
  - @prosopo/load-balancer@2.8.20
  - @prosopo/types-env@2.7.63

## 3.16.1
### Patch Changes

- 9633e58: Add captcha type to decision machine and run on image verification"
- Updated dependencies [9633e58]
  - @prosopo/types-database@4.2.1
  - @prosopo/types@3.8.2
  - @prosopo/api@3.1.43
  - @prosopo/database@3.6.9
  - @prosopo/datasets@3.0.58
  - @prosopo/types-env@2.7.62
  - @prosopo/api-express-router@3.0.50
  - @prosopo/env@3.2.38
  - @prosopo/keyring@2.9.2
  - @prosopo/load-balancer@2.8.19
  - @prosopo/user-access-policy@3.6.3

## 3.16.0
### Minor Changes

- 4299cae: Adding site key to session records

### Patch Changes

- 261f89f: Actually set the site key
- f52a5c1: Adding decision machine to provider for behavior detection
- Updated dependencies [f52a5c1]
- Updated dependencies [4299cae]
  - @prosopo/types-database@4.2.0
  - @prosopo/database@3.6.8
  - @prosopo/types@3.8.1
  - @prosopo/api@3.1.42
  - @prosopo/datasets@3.0.57
  - @prosopo/types-env@2.7.61
  - @prosopo/env@3.2.37
  - @prosopo/api-express-router@3.0.49
  - @prosopo/keyring@2.9.1
  - @prosopo/load-balancer@2.8.18
  - @prosopo/user-access-policy@3.6.2

## 3.15.2
### Patch Changes

- Updated dependencies [ed87b6f]
  - @prosopo/user-access-policy@3.6.1
  - @prosopo/database@3.6.7
  - @prosopo/types-database@4.1.6
  - @prosopo/env@3.2.36
  - @prosopo/datasets@3.0.56
  - @prosopo/types-env@2.7.60
  - @prosopo/api-express-router@3.0.48

## 3.15.1
### Patch Changes

- 15254a3: Key cycle

## 3.15.0
### Minor Changes

- 6a4d57d: Move account creation into worker

### Patch Changes

- a53526b: enhance/pow-client-solution
- 3acc333: Update pow record at verify
- 3acc333: Add JWT issuance to keypairs
- 0a38892: feat/cross-os-testing
- 3acc333: ip parsing
- a8faa9a: bump license year
- 7543d17: mouse movements bot stopping
- fe9fe22: adding api returns
- 3acc333: Release 3.3.0
- 4ac7ef0: Fixing provider side typing of collectors
- Updated dependencies [a53526b]
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
  - @prosopo/util@3.2.5
  - @prosopo/types-database@4.1.5
  - @prosopo/database@3.6.6
  - @prosopo/api-express-router@3.0.47
  - @prosopo/util-crypto@13.5.29
  - @prosopo/keyring@2.9.0
  - @prosopo/types@3.8.0
  - @prosopo/user-access-policy@3.6.0
  - @prosopo/load-balancer@2.8.17
  - @prosopo/api-route@2.6.36
  - @prosopo/types-env@2.7.59
  - @prosopo/datasets@3.0.55
  - @prosopo/common@3.1.28
  - @prosopo/locale@3.1.28
  - @prosopo/api@3.1.41
  - @prosopo/env@3.2.35

## 3.14.7
### Patch Changes

- 41f8a82: Export userscope fn
- Updated dependencies [378a896]
- Updated dependencies [90fddd8]
  - @prosopo/user-access-policy@3.5.37
  - @prosopo/database@3.6.5
  - @prosopo/types-database@4.1.4
  - @prosopo/env@3.2.34
  - @prosopo/datasets@3.0.54
  - @prosopo/types-env@2.7.58
  - @prosopo/api-express-router@3.0.46

## 3.14.6
### Patch Changes

- c6faa77: Fix

## 3.14.5
### Patch Changes

- 7c475dc: Add headHash and coords fields to user access policies, and implement user access policy checks in server-side PoW verification
- Updated dependencies [7c475dc]
  - @prosopo/user-access-policy@3.5.36
  - @prosopo/database@3.6.4
  - @prosopo/types-database@4.1.3
  - @prosopo/env@3.2.33
  - @prosopo/datasets@3.0.53
  - @prosopo/types-env@2.7.57
  - @prosopo/api-express-router@3.0.45

## 3.14.4
### Patch Changes

- Updated dependencies [9ab5f11]
  - @prosopo/database@3.6.3
  - @prosopo/env@3.2.32
  - @prosopo/api-express-router@3.0.44

## 3.14.3
### Patch Changes

- ea5f1f8: Fix detectors

## 3.14.2
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/api@3.1.40
  - @prosopo/api-express-router@3.0.43
  - @prosopo/database@3.6.2
  - @prosopo/datasets@3.0.52
  - @prosopo/env@3.2.31
  - @prosopo/keyring@2.8.43
  - @prosopo/load-balancer@2.8.16
  - @prosopo/types-database@4.1.2
  - @prosopo/types-env@2.7.56
  - @prosopo/user-access-policy@3.5.35

## 3.14.1
### Patch Changes

- b5b21f8: Reduce Sample Size
- 345b25b: pow coord
- 1fd84de: Make sure session Ids are unique
- Updated dependencies [345b25b]
  - @prosopo/types-database@4.1.1
  - @prosopo/database@3.6.1
  - @prosopo/types@3.7.1
  - @prosopo/api@3.1.39
  - @prosopo/datasets@3.0.51
  - @prosopo/types-env@2.7.55
  - @prosopo/env@3.2.30
  - @prosopo/api-express-router@3.0.42
  - @prosopo/keyring@2.8.42
  - @prosopo/load-balancer@2.8.15
  - @prosopo/user-access-policy@3.5.34

## 3.14.0
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
- 5ad6f48: Fix detect webview iphones
- f6b5094: Allow different context to override default
- e3a8948: Run job for pro+ only
- e01227b: add turbo
- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
- Updated dependencies [e01227b]
  - @prosopo/types@3.7.0
  - @prosopo/types-database@4.1.0
  - @prosopo/database@3.6.0
  - @prosopo/locale@3.1.27
  - @prosopo/api@3.1.38
  - @prosopo/api-express-router@3.0.41
  - @prosopo/common@3.1.27
  - @prosopo/datasets@3.0.50
  - @prosopo/env@3.2.29
  - @prosopo/keyring@2.8.41
  - @prosopo/load-balancer@2.8.14
  - @prosopo/types-env@2.7.54
  - @prosopo/user-access-policy@3.5.33
  - @prosopo/api-route@2.6.35

## 3.13.7
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/api@3.1.37
  - @prosopo/api-express-router@3.0.40
  - @prosopo/api-route@2.6.34
  - @prosopo/common@3.1.26
  - @prosopo/database@3.5.6
  - @prosopo/datasets@3.0.49
  - @prosopo/env@3.2.28
  - @prosopo/keyring@2.8.40
  - @prosopo/load-balancer@2.8.13
  - @prosopo/locale@3.1.26
  - @prosopo/types@3.6.4
  - @prosopo/types-database@4.0.6
  - @prosopo/types-env@2.7.53
  - @prosopo/user-access-policy@3.5.32
  - @prosopo/util@3.2.4
  - @prosopo/util-crypto@13.5.28

## 3.13.6
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/api@3.1.36
  - @prosopo/api-express-router@3.0.39
  - @prosopo/api-route@2.6.33
  - @prosopo/common@3.1.25
  - @prosopo/database@3.5.5
  - @prosopo/datasets@3.0.48
  - @prosopo/env@3.2.27
  - @prosopo/keyring@2.8.39
  - @prosopo/load-balancer@2.8.12
  - @prosopo/locale@3.1.25
  - @prosopo/types@3.6.3
  - @prosopo/types-database@4.0.5
  - @prosopo/types-env@2.7.52
  - @prosopo/user-access-policy@3.5.31
  - @prosopo/util@3.2.3
  - @prosopo/util-crypto@13.5.27

## 3.13.5
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep
- e843e62: Adding more sensible punishment for invalid decryption key
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/api-express-router@3.0.38
  - @prosopo/user-access-policy@3.5.30
  - @prosopo/types-database@4.0.4
  - @prosopo/load-balancer@2.8.11
  - @prosopo/util-crypto@13.5.26
  - @prosopo/api-route@2.6.32
  - @prosopo/types-env@2.7.51
  - @prosopo/database@3.5.4
  - @prosopo/datasets@3.0.47
  - @prosopo/keyring@2.8.38
  - @prosopo/common@3.1.24
  - @prosopo/locale@3.1.24
  - @prosopo/types@3.6.2
  - @prosopo/util@3.2.2
  - @prosopo/api@3.1.35
  - @prosopo/env@3.2.26

## 3.13.4
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23
  - @prosopo/api@3.1.34
  - @prosopo/api-express-router@3.0.37
  - @prosopo/api-route@2.6.31
  - @prosopo/common@3.1.23
  - @prosopo/database@3.5.3
  - @prosopo/datasets@3.0.46
  - @prosopo/env@3.2.25
  - @prosopo/keyring@2.8.37
  - @prosopo/load-balancer@2.8.10
  - @prosopo/locale@3.1.23
  - @prosopo/types@3.6.1
  - @prosopo/types-database@4.0.3
  - @prosopo/types-env@2.7.50
  - @prosopo/user-access-policy@3.5.29
  - @prosopo/util@3.2.1
  - @prosopo/util-crypto@13.5.25

## 3.13.3
### Patch Changes

- 3be9174: Create scheduled task status
- Updated dependencies [0a9887c]
  - @prosopo/types-database@4.0.2
  - @prosopo/database@3.5.2
  - @prosopo/datasets@3.0.45
  - @prosopo/types-env@2.7.49
  - @prosopo/env@3.2.24
  - @prosopo/api-express-router@3.0.36

## 3.13.2
### Patch Changes

- Updated dependencies [3e5d80a]
  - @prosopo/types-database@4.0.1
  - @prosopo/database@3.5.1
  - @prosopo/datasets@3.0.44
  - @prosopo/types-env@2.7.48
  - @prosopo/env@3.2.23
  - @prosopo/api-express-router@3.0.35

## 3.13.1
### Patch Changes

- 447179c: Fix config and client getter

## 3.13.0
### Minor Changes

- bb5f41c: Context awareness

### Patch Changes

- fdef625: fix maint mode
- 55a64c6: stop refresh image to pow
- aa8216a: bump
- 8ce9205: Change engine requirements
- 6ac5367: Less drastic reaction to bad sim score
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
  - @prosopo/database@3.5.0
  - @prosopo/util@3.2.0
  - @prosopo/api-express-router@3.0.34
  - @prosopo/load-balancer@2.8.9
  - @prosopo/util-crypto@13.5.24
  - @prosopo/api-route@2.6.30
  - @prosopo/types-env@2.7.47
  - @prosopo/datasets@3.0.43
  - @prosopo/keyring@2.8.36
  - @prosopo/common@3.1.22
  - @prosopo/locale@3.1.22
  - @prosopo/api@3.1.33
  - @prosopo/env@3.2.22
  - @prosopo/config@3.1.22

## 3.12.14
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/api@3.1.32
  - @prosopo/api-express-router@3.0.33
  - @prosopo/database@3.4.13
  - @prosopo/datasets@3.0.42
  - @prosopo/env@3.2.21
  - @prosopo/keyring@2.8.35
  - @prosopo/load-balancer@2.8.8
  - @prosopo/types-database@3.3.13
  - @prosopo/types-env@2.7.46
  - @prosopo/user-access-policy@3.5.27

## 3.12.13
### Patch Changes

- cb8ab85: head entropy for bot detection
- Updated dependencies [cb8ab85]
  - @prosopo/types-database@3.3.12
  - @prosopo/types@3.5.10
  - @prosopo/api@3.1.31
  - @prosopo/database@3.4.12
  - @prosopo/datasets@3.0.41
  - @prosopo/types-env@2.7.45
  - @prosopo/api-express-router@3.0.32
  - @prosopo/env@3.2.20
  - @prosopo/keyring@2.8.34
  - @prosopo/load-balancer@2.8.7
  - @prosopo/user-access-policy@3.5.26

## 3.12.12
### Patch Changes

- 43907e8: Convert timestamp fields from numbers to Date objects throughout codebase
- b4639ec: Merge frictionless tokens into sessions
- 7101036: Force consistent IPs logic
- Updated dependencies [43907e8]
- Updated dependencies [b4639ec]
- Updated dependencies [005ce66]
- Updated dependencies [b58046d]
- Updated dependencies [7101036]
  - @prosopo/types-database@3.3.11
  - @prosopo/types@3.5.9
  - @prosopo/database@3.4.11
  - @prosopo/user-access-policy@3.5.25
  - @prosopo/load-balancer@2.8.6
  - @prosopo/util@3.1.7
  - @prosopo/datasets@3.0.40
  - @prosopo/types-env@2.7.44
  - @prosopo/api@3.1.30
  - @prosopo/api-express-router@3.0.31
  - @prosopo/env@3.2.19
  - @prosopo/keyring@2.8.33

## 3.12.11
### Patch Changes

- 4b6dc9d: Block at verify
- e5c259d: .
- 6420187: Save iframe
- Updated dependencies [b10a65f]
- Updated dependencies [e5c259d]
- Updated dependencies [6420187]
  - @prosopo/types-database@3.3.10
  - @prosopo/types@3.5.8
  - @prosopo/database@3.4.10
  - @prosopo/datasets@3.0.39
  - @prosopo/types-env@2.7.43
  - @prosopo/api@3.1.29
  - @prosopo/api-express-router@3.0.30
  - @prosopo/env@3.2.18
  - @prosopo/keyring@2.8.32
  - @prosopo/load-balancer@2.8.5
  - @prosopo/user-access-policy@3.5.24

## 3.12.10
### Patch Changes

- b8185a4: feat/uap-rules-syncer
- 3a027ef: Fix session storer
- 3a027ef: Release cycle
- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
- Updated dependencies [3a027ef]
- Updated dependencies [3a027ef]
  - @prosopo/user-access-policy@3.5.23
  - @prosopo/api@3.1.28
  - @prosopo/common@3.1.21
  - @prosopo/api-express-router@3.0.29
  - @prosopo/api-route@2.6.29
  - @prosopo/database@3.4.9
  - @prosopo/config@3.1.21
  - @prosopo/types-database@3.3.9
  - @prosopo/datasets@3.0.38
  - @prosopo/env@3.2.17
  - @prosopo/keyring@2.8.31
  - @prosopo/load-balancer@2.8.4
  - @prosopo/types-env@2.7.42
  - @prosopo/locale@3.1.21
  - @prosopo/types@3.5.7
  - @prosopo/util@3.1.6
  - @prosopo/util-crypto@13.5.23

## 3.12.9
### Patch Changes

- 8491159: Store webview

## 3.12.8
### Patch Changes

- 5d11a81: Adding maintenance mode
- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/api@3.1.27
  - @prosopo/api-express-router@3.0.28
  - @prosopo/database@3.4.8
  - @prosopo/datasets@3.0.37
  - @prosopo/env@3.2.16
  - @prosopo/keyring@2.8.30
  - @prosopo/load-balancer@2.8.3
  - @prosopo/types-database@3.3.8
  - @prosopo/types-env@2.7.41
  - @prosopo/user-access-policy@3.5.22

## 3.12.7
### Patch Changes

- cbc5d8e: Additional logging

## 3.12.6
### Patch Changes

- 494c5a8: Updated payload
- Updated dependencies [494c5a8]
  - @prosopo/types-database@3.3.7
  - @prosopo/types@3.5.5
  - @prosopo/database@3.4.7
  - @prosopo/datasets@3.0.36
  - @prosopo/types-env@2.7.40
  - @prosopo/api@3.1.26
  - @prosopo/api-express-router@3.0.27
  - @prosopo/env@3.2.15
  - @prosopo/keyring@2.8.29
  - @prosopo/load-balancer@2.8.2
  - @prosopo/user-access-policy@3.5.21

## 3.12.5
### Patch Changes

- 4ba029e: repo maintainance

## 3.12.4
### Patch Changes

- 08ff50f: Hot fix country code
- Updated dependencies [08ff50f]
- Updated dependencies [08ff50f]
  - @prosopo/types-database@3.3.6
  - @prosopo/types@3.5.4
  - @prosopo/database@3.4.6
  - @prosopo/datasets@3.0.35
  - @prosopo/types-env@2.7.39
  - @prosopo/api@3.1.25
  - @prosopo/api-express-router@3.0.26
  - @prosopo/env@3.2.14
  - @prosopo/keyring@2.8.28
  - @prosopo/load-balancer@2.8.1
  - @prosopo/user-access-policy@3.5.20

## 3.12.3
### Patch Changes

- 04d0f1a: weighted random provider selection
- Updated dependencies [04d0f1a]
- Updated dependencies [1e3a838]
  - @prosopo/load-balancer@2.8.0
  - @prosopo/config@3.1.20
  - @prosopo/api@3.1.24
  - @prosopo/api-express-router@3.0.25
  - @prosopo/api-route@2.6.28
  - @prosopo/common@3.1.20
  - @prosopo/database@3.4.5
  - @prosopo/datasets@3.0.34
  - @prosopo/env@3.2.13
  - @prosopo/keyring@2.8.27
  - @prosopo/locale@3.1.20
  - @prosopo/types@3.5.3
  - @prosopo/types-database@3.3.5
  - @prosopo/types-env@2.7.38
  - @prosopo/user-access-policy@3.5.19
  - @prosopo/util@3.1.5
  - @prosopo/util-crypto@13.5.22

## 3.12.2
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/api-express-router@3.0.24
  - @prosopo/user-access-policy@3.5.18
  - @prosopo/types-database@3.3.4
  - @prosopo/load-balancer@2.7.12
  - @prosopo/util-crypto@13.5.21
  - @prosopo/api-route@2.6.27
  - @prosopo/types-env@2.7.37
  - @prosopo/database@3.4.4
  - @prosopo/datasets@3.0.33
  - @prosopo/keyring@2.8.26
  - @prosopo/locale@3.1.19
  - @prosopo/types@3.5.2
  - @prosopo/util@3.1.4
  - @prosopo/api@3.1.23
  - @prosopo/env@3.2.12
  - @prosopo/config@3.1.19

## 3.12.1
### Patch Changes

- 52cd544: Integrity checks
- b8cc590: New injection methods
- b117ba3: Hot fix country code
- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [c72ecbd]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/database@3.4.3
  - @prosopo/api-express-router@3.0.23
  - @prosopo/user-access-policy@3.5.17
  - @prosopo/types-database@3.3.3
  - @prosopo/load-balancer@2.7.11
  - @prosopo/util-crypto@13.5.20
  - @prosopo/api-route@2.6.26
  - @prosopo/types-env@2.7.36
  - @prosopo/datasets@3.0.32
  - @prosopo/keyring@2.8.25
  - @prosopo/common@3.1.18
  - @prosopo/locale@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/api@3.1.22
  - @prosopo/env@3.2.11
  - @prosopo/config@3.1.18

## 3.12.0
### Minor Changes

- e20ad6b: IP country overrides

### Patch Changes

- 618703f: Release 3.4.2
- cf6c8a4: Hot fix the request logger
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/api-express-router@3.0.22
  - @prosopo/user-access-policy@3.5.16
  - @prosopo/types-database@3.3.2
  - @prosopo/load-balancer@2.7.10
  - @prosopo/util-crypto@13.5.19
  - @prosopo/api-route@2.6.25
  - @prosopo/types-env@2.7.35
  - @prosopo/database@3.4.2
  - @prosopo/datasets@3.0.31
  - @prosopo/keyring@2.8.24
  - @prosopo/common@3.1.17
  - @prosopo/locale@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/util@3.1.2
  - @prosopo/api@3.1.21
  - @prosopo/env@3.2.10
  - @prosopo/config@3.1.17

## 3.11.1
### Patch Changes

- 7e5613a: Always store image rounds count
- 11303d9: feat/pluggable-redis
- b6794f8: Timestamp decay fn
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
  - @prosopo/database@3.4.1
  - @prosopo/types-database@3.3.1
  - @prosopo/api-express-router@3.0.21
  - @prosopo/load-balancer@2.7.9
  - @prosopo/util-crypto@13.5.18
  - @prosopo/api-route@2.6.24
  - @prosopo/types-env@2.7.34
  - @prosopo/datasets@3.0.30
  - @prosopo/keyring@2.8.23
  - @prosopo/common@3.1.16
  - @prosopo/locale@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/util@3.1.1
  - @prosopo/api@3.1.20
  - @prosopo/env@3.2.9
  - @prosopo/config@3.1.16

## 3.11.0
### Minor Changes

- 6768f14: Update salt

### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/api-express-router@3.0.20
  - @prosopo/user-access-policy@3.5.14
  - @prosopo/types-database@3.3.0
  - @prosopo/load-balancer@2.7.8
  - @prosopo/util-crypto@13.5.17
  - @prosopo/api-route@2.6.23
  - @prosopo/types-env@2.7.33
  - @prosopo/database@3.4.0
  - @prosopo/datasets@3.0.29
  - @prosopo/keyring@2.8.22
  - @prosopo/common@3.1.15
  - @prosopo/locale@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/util@3.1.0
  - @prosopo/api@3.1.19
  - @prosopo/env@3.2.8
  - @prosopo/config@3.1.15

## 3.10.0
### Minor Changes

- 97edf3f: Adding dom manip checks

### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/api-express-router@3.0.19
  - @prosopo/user-access-policy@3.5.13
  - @prosopo/types-database@3.2.2
  - @prosopo/load-balancer@2.7.7
  - @prosopo/util-crypto@13.5.16
  - @prosopo/api-route@2.6.22
  - @prosopo/types-env@2.7.32
  - @prosopo/database@3.3.2
  - @prosopo/datasets@3.0.28
  - @prosopo/keyring@2.8.21
  - @prosopo/common@3.1.14
  - @prosopo/locale@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/api@3.1.18
  - @prosopo/env@3.2.7
  - @prosopo/config@3.1.14

## 3.9.1
### Patch Changes

- 5137f01: Update pow record at verify
- bebb855: ip parsing
- 509be28: Fix IP conditions logic
- 509be28: Fix require all conditions logic
- 008d112: Release 3.3.0
- Updated dependencies [5137f01]
- Updated dependencies [0555cd8]
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types-database@3.2.1
  - @prosopo/database@3.3.1
  - @prosopo/types@3.2.1
  - @prosopo/api-express-router@3.0.18
  - @prosopo/user-access-policy@3.5.12
  - @prosopo/load-balancer@2.7.6
  - @prosopo/util-crypto@13.5.15
  - @prosopo/api-route@2.6.21
  - @prosopo/types-env@2.7.31
  - @prosopo/datasets@3.0.27
  - @prosopo/keyring@2.8.20
  - @prosopo/common@3.1.13
  - @prosopo/locale@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/api@3.1.17
  - @prosopo/env@3.2.6
  - @prosopo/config@3.1.13

## 3.9.0
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
  - @prosopo/database@3.3.0
  - @prosopo/types@3.2.0
  - @prosopo/api-express-router@3.0.17
  - @prosopo/user-access-policy@3.5.11
  - @prosopo/load-balancer@2.7.5
  - @prosopo/util-crypto@13.5.14
  - @prosopo/api-route@2.6.20
  - @prosopo/types-env@2.7.30
  - @prosopo/datasets@3.0.26
  - @prosopo/keyring@2.8.19
  - @prosopo/common@3.1.12
  - @prosopo/locale@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/api@3.1.16
  - @prosopo/env@3.2.5
  - @prosopo/config@3.1.12

## 3.8.4
### Patch Changes

- 0d1a33e: Adding ipcomparison service with user features
- 0d1a33e: Adding ip comparison service
- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/types-database@3.1.5
  - @prosopo/locale@3.1.11
  - @prosopo/types@3.1.4
  - @prosopo/api-express-router@3.0.16
  - @prosopo/user-access-policy@3.5.10
  - @prosopo/load-balancer@2.7.4
  - @prosopo/util-crypto@13.5.13
  - @prosopo/api-route@2.6.19
  - @prosopo/types-env@2.7.29
  - @prosopo/database@3.2.4
  - @prosopo/datasets@3.0.25
  - @prosopo/keyring@2.8.18
  - @prosopo/common@3.1.11
  - @prosopo/util@3.0.14
  - @prosopo/api@3.1.15
  - @prosopo/env@3.2.4
  - @prosopo/config@3.1.11

## 3.8.3
### Patch Changes

- 36b23e0: Fix entropy. Fix api call. Persist ja4 through logs.
- 657a827: Release 3.2.2
- 4aac849: Do not error when IPs don't match
- Updated dependencies [36b23e0]
- Updated dependencies [a8a9251]
- Updated dependencies [657a827]
  - @prosopo/api@3.1.14
  - @prosopo/types-database@3.1.4
  - @prosopo/api-express-router@3.0.15
  - @prosopo/user-access-policy@3.5.9
  - @prosopo/load-balancer@2.7.3
  - @prosopo/util-crypto@13.5.12
  - @prosopo/api-route@2.6.18
  - @prosopo/types-env@2.7.28
  - @prosopo/database@3.2.3
  - @prosopo/datasets@3.0.24
  - @prosopo/keyring@2.8.17
  - @prosopo/common@3.1.10
  - @prosopo/locale@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/util@3.0.13
  - @prosopo/env@3.2.3
  - @prosopo/config@3.1.10

## 3.8.2
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- 1249ce0: Be more lenient with random provider selection
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/api-express-router@3.0.14
  - @prosopo/user-access-policy@3.5.8
  - @prosopo/types-database@3.1.3
  - @prosopo/load-balancer@2.7.2
  - @prosopo/util-crypto@13.5.11
  - @prosopo/api-route@2.6.17
  - @prosopo/types-env@2.7.27
  - @prosopo/database@3.2.2
  - @prosopo/datasets@3.0.23
  - @prosopo/keyring@2.8.16
  - @prosopo/common@3.1.9
  - @prosopo/locale@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/util@3.0.12
  - @prosopo/api@3.1.13
  - @prosopo/env@3.2.2
  - @prosopo/config@3.1.9

## 3.8.1
### Patch Changes

- 1f980c4: Fix types mismatch in decryption
- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/load-balancer@2.7.1
  - @prosopo/types@3.1.1
  - @prosopo/api-express-router@3.0.13
  - @prosopo/user-access-policy@3.5.7
  - @prosopo/types-database@3.1.2
  - @prosopo/util-crypto@13.5.10
  - @prosopo/api-route@2.6.16
  - @prosopo/types-env@2.7.26
  - @prosopo/database@3.2.1
  - @prosopo/datasets@3.0.22
  - @prosopo/keyring@2.8.15
  - @prosopo/common@3.1.8
  - @prosopo/locale@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/api@3.1.12
  - @prosopo/env@3.2.1
  - @prosopo/config@3.1.8

## 3.8.0
### Minor Changes

- 8bdc7f0: Using detector to select provider

### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/api-express-router@3.0.12
  - @prosopo/user-access-policy@3.5.6
  - @prosopo/types-database@3.1.1
  - @prosopo/load-balancer@2.7.0
  - @prosopo/util-crypto@13.5.9
  - @prosopo/api-route@2.6.15
  - @prosopo/types-env@2.7.25
  - @prosopo/database@3.2.0
  - @prosopo/datasets@3.0.21
  - @prosopo/keyring@2.8.14
  - @prosopo/common@3.1.7
  - @prosopo/locale@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/util@3.0.10
  - @prosopo/api@3.1.11
  - @prosopo/env@3.2.0
  - @prosopo/config@3.1.7

## 3.7.0
### Minor Changes

- 9b92339: fix/ipv6-in-captcha-flow

### Patch Changes

- a07db04: Release 3.1.12
- ebb0168: Allowing for simple pattern matching with domains
- Updated dependencies [9b92339]
- Updated dependencies [9eed772]
- Updated dependencies [a07db04]
- Updated dependencies [ebb0168]
  - @prosopo/types-database@3.1.0
  - @prosopo/database@3.1.0
  - @prosopo/datasets@3.0.20
  - @prosopo/config@3.1.6
  - @prosopo/api-express-router@3.0.11
  - @prosopo/user-access-policy@3.5.5
  - @prosopo/types-env@2.7.24
  - @prosopo/api@3.1.10
  - @prosopo/env@3.1.11
  - @prosopo/util@3.0.9
  - @prosopo/api-route@2.6.14
  - @prosopo/common@3.1.6
  - @prosopo/keyring@2.8.13
  - @prosopo/load-balancer@2.6.21
  - @prosopo/locale@3.1.6
  - @prosopo/types@3.0.10
  - @prosopo/util-crypto@13.5.8

## 3.6.2
### Patch Changes

- Updated dependencies [e64160c]
- Updated dependencies [553025d]
  - @prosopo/database@3.0.19
  - @prosopo/user-access-policy@3.5.4
  - @prosopo/env@3.1.10
  - @prosopo/api@3.1.9
  - @prosopo/types-database@3.0.19
  - @prosopo/api-express-router@3.0.10
  - @prosopo/datasets@3.0.19
  - @prosopo/types-env@2.7.23

## 3.6.1
### Patch Changes

- d8e855c: Adding checks for IP consistency throughout the verification process
- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [d8e855c]
- Updated dependencies [6960643]
  - @prosopo/types-database@3.0.18
  - @prosopo/locale@3.1.5
  - @prosopo/api-express-router@3.0.9
  - @prosopo/user-access-policy@3.5.3
  - @prosopo/load-balancer@2.6.20
  - @prosopo/util-crypto@13.5.7
  - @prosopo/api-route@2.6.13
  - @prosopo/types-env@2.7.22
  - @prosopo/database@3.0.18
  - @prosopo/datasets@3.0.18
  - @prosopo/keyring@2.8.12
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9
  - @prosopo/util@3.0.8
  - @prosopo/api@3.1.8
  - @prosopo/env@3.1.9

## 3.6.0
### Minor Changes

- dc5ce11: Use out of the box JA4 impl

### Patch Changes

- 6b98f67: Fix recency checker
- Updated dependencies [30e7d4d]
  - @prosopo/datasets@3.0.17
  - @prosopo/config@3.1.5
  - @prosopo/api-express-router@3.0.8
  - @prosopo/api-route@2.6.12
  - @prosopo/common@3.1.4
  - @prosopo/database@3.0.17
  - @prosopo/env@3.1.8
  - @prosopo/keyring@2.8.11
  - @prosopo/load-balancer@2.6.19
  - @prosopo/types@3.0.8
  - @prosopo/types-database@3.0.17
  - @prosopo/types-env@2.7.21
  - @prosopo/user-access-policy@3.5.2
  - @prosopo/util@3.0.7
  - @prosopo/util-crypto@13.5.6

## 3.5.0
### Minor Changes

- 3834a10: Proper session validation

### Patch Changes

- 0c865a7: Add missing var
- 1f3a02f: Release 3.1.8
- Updated dependencies [1f3a02f]
  - @prosopo/user-access-policy@3.5.1
  - @prosopo/types-database@3.0.16
  - @prosopo/types-env@2.7.20
  - @prosopo/database@3.0.16
  - @prosopo/datasets@3.0.16
  - @prosopo/env@3.1.7

## 3.4.0
### Minor Changes

- e0628d9: Make sure rules don't leak between IPs

### Patch Changes

- 8cc6551: x
- Updated dependencies [926df8a]
- Updated dependencies [e0628d9]
  - @prosopo/datasets@3.0.15
  - @prosopo/user-access-policy@3.5.0
  - @prosopo/database@3.0.15
  - @prosopo/types-database@3.0.15
  - @prosopo/env@3.1.6
  - @prosopo/types-env@2.7.19

## 3.3.1
### Patch Changes

- a49b538: Extra tests
- e090e2f: More tests
- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
- Updated dependencies [e090e2f]
  - @prosopo/config@3.1.4
  - @prosopo/user-access-policy@3.4.1
  - @prosopo/common@3.1.3
  - @prosopo/api-express-router@3.0.7
  - @prosopo/api-route@2.6.11
  - @prosopo/database@3.0.14
  - @prosopo/datasets@3.0.14
  - @prosopo/env@3.1.5
  - @prosopo/keyring@2.8.10
  - @prosopo/types@3.0.7
  - @prosopo/types-database@3.0.14
  - @prosopo/types-env@2.7.18
  - @prosopo/util@3.0.6
  - @prosopo/util-crypto@13.5.5

## 3.3.0
### Minor Changes

- df4e030: Revising UAP rule getters

### Patch Changes

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
  - @prosopo/api-route@2.6.10
  - @prosopo/types-env@2.7.17
  - @prosopo/database@3.0.13
  - @prosopo/common@3.1.2
  - @prosopo/types@3.0.6
  - @prosopo/env@3.1.4
  - @prosopo/config@3.1.3
  - @prosopo/user-access-policy@3.4.0
  - @prosopo/api-express-router@3.0.6
  - @prosopo/util-crypto@13.5.4
  - @prosopo/datasets@3.0.13
  - @prosopo/keyring@2.8.9
  - @prosopo/util@3.0.5

## 3.2.5
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/api-express-router@3.0.5
  - @prosopo/user-access-policy@3.3.2
  - @prosopo/types-database@3.0.12
  - @prosopo/util-crypto@13.5.3
  - @prosopo/api-route@2.6.9
  - @prosopo/types-env@2.7.16
  - @prosopo/database@3.0.12
  - @prosopo/datasets@3.0.12
  - @prosopo/keyring@2.8.8
  - @prosopo/common@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/util@3.0.4
  - @prosopo/env@3.1.3
  - @prosopo/config@3.1.2

## 3.2.4
### Patch Changes

- Updated dependencies [625fef8]
  - @prosopo/types-database@3.0.11
  - @prosopo/database@3.0.11
  - @prosopo/datasets@3.0.11
  - @prosopo/env@3.1.2
  - @prosopo/types-env@2.7.15

## 3.2.3
### Patch Changes

- 58ab0ce: logging key fix

## 3.2.2
### Patch Changes

- 9e4e7ca: better key logging

## 3.2.1
### Patch Changes

- 2f0c830: Remove node-fetch
- 52dbf21: bumping deps
- 3573f0b: fix npm scripts bundle command
- 3573f0b: build using vite, typecheck using tsc
- efd8102: Add tests for unwrap error helper
- 63519d7: Tests
- f29fc7e: Refining API error handling. Adding more language strings
- 3573f0b: standardise all vite based npm scripts for bundling
- 2d0dd8a: Integration tests for UAPs
- Updated dependencies [52dbf21]
- Updated dependencies [93d5e50]
- Updated dependencies [3573f0b]
- Updated dependencies [8a64429]
- Updated dependencies [3573f0b]
- Updated dependencies [efd8102]
- Updated dependencies [93d5e50]
- Updated dependencies [63519d7]
- Updated dependencies [f29fc7e]
- Updated dependencies [3573f0b]
- Updated dependencies [2d0dd8a]
- Updated dependencies [6d604ad]
  - @prosopo/util@3.0.3
  - @prosopo/util-crypto@13.5.2
  - @prosopo/types-env@2.7.14
  - @prosopo/keyring@2.8.7
  - @prosopo/types@3.0.4
  - @prosopo/api-express-router@3.0.4
  - @prosopo/user-access-policy@3.3.1
  - @prosopo/types-database@3.0.10
  - @prosopo/api-route@2.6.8
  - @prosopo/database@3.0.10
  - @prosopo/datasets@3.0.10
  - @prosopo/common@3.1.0
  - @prosopo/env@3.1.1
  - @prosopo/config@3.1.1

## 3.2.0
### Minor Changes

- b7c3258: Add tests for UAPs

### Patch Changes

- Updated dependencies [b7c3258]
  - @prosopo/user-access-policy@3.3.0
  - @prosopo/env@3.1.0
  - @prosopo/database@3.0.9
  - @prosopo/types-database@3.0.9
  - @prosopo/datasets@3.0.9
  - @prosopo/types-env@2.7.13

## 3.1.3
### Patch Changes

- Updated dependencies [cdf7c29]
  - @prosopo/user-access-policy@3.2.1
  - @prosopo/database@3.0.8
  - @prosopo/types-database@3.0.8
  - @prosopo/env@3.0.8
  - @prosopo/datasets@3.0.8
  - @prosopo/types-env@2.7.12

## 3.1.2
### Patch Changes

- Updated dependencies [a7164ce]
  - @prosopo/user-access-policy@3.2.0
  - @prosopo/database@3.0.7
  - @prosopo/types-database@3.0.7
  - @prosopo/env@3.0.7
  - @prosopo/datasets@3.0.7
  - @prosopo/types-env@2.7.11

## 3.1.1
### Patch Changes

- b0d7207: Types for proper rotation
- Updated dependencies [b0d7207]
  - @prosopo/types-database@3.0.6
  - @prosopo/database@3.0.6
  - @prosopo/types@3.0.3
  - @prosopo/datasets@3.0.6
  - @prosopo/env@3.0.6
  - @prosopo/types-env@2.7.10
  - @prosopo/keyring@2.8.6
  - @prosopo/user-access-policy@3.1.5

## 3.1.0
### Minor Changes

- 9e18fca: Make resolver easier to use

## 3.0.6
### Patch Changes

- 9671152: uuid
- Updated dependencies [9671152]
  - @prosopo/api-express-router@3.0.3

## 3.0.5
### Patch Changes

- Updated dependencies [745cc89]
  - @prosopo/config@3.1.0
  - @prosopo/database@3.0.5
  - @prosopo/datasets@3.0.5
  - @prosopo/env@3.0.5
  - @prosopo/types-database@3.0.5
  - @prosopo/types-env@2.7.9
  - @prosopo/util@3.0.2
  - @prosopo/user-access-policy@3.1.4

## 3.0.4
### Patch Changes

- Updated dependencies [5619b4b]
  - @prosopo/config@3.0.1
  - @prosopo/database@3.0.4
  - @prosopo/datasets@3.0.4
  - @prosopo/env@3.0.4
  - @prosopo/types-database@3.0.4
  - @prosopo/types-env@2.7.8
  - @prosopo/util@3.0.1
  - @prosopo/user-access-policy@3.1.3

## 3.0.3
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/types-database@3.0.3
  - @prosopo/database@3.0.3
  - @prosopo/types@3.0.2
  - @prosopo/datasets@3.0.3
  - @prosopo/env@3.0.3
  - @prosopo/types-env@2.7.7
  - @prosopo/common@3.0.2
  - @prosopo/keyring@2.8.5
  - @prosopo/user-access-policy@3.1.2
  - @prosopo/api-express-router@3.0.2
  - @prosopo/api-route@2.6.7

## 3.0.2
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/api-express-router@3.0.1
  - @prosopo/api-route@2.6.6
  - @prosopo/database@3.0.2
  - @prosopo/datasets@3.0.2
  - @prosopo/env@3.0.2
  - @prosopo/keyring@2.8.4
  - @prosopo/types-database@3.0.2
  - @prosopo/types-env@2.7.6
  - @prosopo/user-access-policy@3.1.1

## 3.0.1
### Patch Changes

- Updated dependencies [913f2a6]
  - @prosopo/user-access-policy@3.1.0
  - @prosopo/types-database@3.0.1
  - @prosopo/database@3.0.1
  - @prosopo/datasets@3.0.1
  - @prosopo/env@3.0.1
  - @prosopo/types-env@2.7.5

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/api-express-router@3.0.0
  - @prosopo/user-access-policy@3.0.0
  - @prosopo/types-database@3.0.0
  - @prosopo/database@3.0.0
  - @prosopo/datasets@3.0.0
  - @prosopo/common@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/util@3.0.0
  - @prosopo/env@3.0.0
  - @prosopo/config@3.0.0
  - @prosopo/types-env@2.7.4
  - @prosopo/api-route@2.6.5
  - @prosopo/keyring@2.8.3

## 2.14.0
### Minor Changes

- aee3efe: Add healthz endpoint

### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0
  - @prosopo/database@2.6.9
  - @prosopo/datasets@2.7.3
  - @prosopo/env@2.7.3
  - @prosopo/keyring@2.8.2
  - @prosopo/types-database@2.7.6
  - @prosopo/types-env@2.7.3
  - @prosopo/user-access-policy@2.6.8

## 2.13.0
### Minor Changes

- d5f2e95: Fix ip checking logic

## 2.12.1
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/api-express-router@2.6.4
  - @prosopo/user-access-policy@2.6.7
  - @prosopo/types-database@2.7.5
  - @prosopo/util-crypto@13.5.1
  - @prosopo/api-route@2.6.4
  - @prosopo/types-env@2.7.2
  - @prosopo/database@2.6.8
  - @prosopo/datasets@2.7.2
  - @prosopo/keyring@2.8.1
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1
  - @prosopo/env@2.7.2
  - @prosopo/config@2.6.1
  - @prosopo/util@2.6.1

## 2.12.0
### Minor Changes

- d6de900: ip pass through

## 2.11.0
### Minor Changes

- 30bb383: Making sure verify works and derived accounts

### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/util-crypto@13.5.0
  - @prosopo/keyring@2.8.0
  - @prosopo/types@2.9.0
  - @prosopo/common@2.7.1
  - @prosopo/datasets@2.7.1
  - @prosopo/database@2.6.7
  - @prosopo/env@2.7.1
  - @prosopo/types-database@2.7.4
  - @prosopo/types-env@2.7.1
  - @prosopo/user-access-policy@2.6.6
  - @prosopo/api-express-router@2.6.3
  - @prosopo/api-route@2.6.3

## 2.10.0
### Minor Changes

- 8f0644a: Taking required functions from polkadot/keyring and polkadot/util-crypto in-house and removing WASM dependencies. Adding @scure JS-based sr25519 function instead.

### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/util-crypto@13.4.0
  - @prosopo/types-env@2.7.0
  - @prosopo/datasets@2.7.0
  - @prosopo/keyring@2.7.0
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/env@2.7.0
  - @prosopo/api-express-router@2.6.2
  - @prosopo/api-route@2.6.2
  - @prosopo/database@2.6.6
  - @prosopo/types-database@2.7.3
  - @prosopo/user-access-policy@2.6.5

## 2.9.8

### Patch Changes

- Updated dependencies [ea38a1c]
  - @prosopo/datasets@2.6.12

## 2.9.7

### Patch Changes

- Updated dependencies [b2ae723]
  - @prosopo/datasets@2.6.11

## 2.9.6

### Patch Changes

- Updated dependencies [d17c67f]
  - @prosopo/datasets@2.6.10

## 2.9.5

### Patch Changes

- Updated dependencies [0d194f2]
  - @prosopo/datasets@2.6.9

## 2.9.4

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/api-express-router@2.6.1
  - @prosopo/api-route@2.6.1
  - @prosopo/database@2.6.5
  - @prosopo/datasets@2.6.8
  - @prosopo/env@2.6.5
  - @prosopo/keyring@2.6.4
  - @prosopo/types@2.7.1
  - @prosopo/types-database@2.7.2
  - @prosopo/types-env@2.6.5
  - @prosopo/user-access-policy@2.6.4

## 2.9.3

### Patch Changes

- Updated dependencies [bc892fa]
  - @prosopo/datasets@2.6.7

## 2.9.2

### Patch Changes

- Updated dependencies [84fc39f]
  - @prosopo/datasets@2.6.6

## 2.9.1

### Patch Changes

- 5656b0c: Adding cypress tests for invisible
- 5656b0c: Adding all client examples to bundle example
- Updated dependencies [5656b0c]
- Updated dependencies [5656b0c]
  - @prosopo/datasets@2.6.5

## 2.9.0

### Minor Changes

- 6e1aef6: Add IP check when verifying

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0
  - @prosopo/database@2.6.4
  - @prosopo/datasets@2.6.4
  - @prosopo/env@2.6.4
  - @prosopo/keyring@2.6.3
  - @prosopo/types-database@2.7.1
  - @prosopo/types-env@2.6.4
  - @prosopo/user-access-policy@2.6.3

## 2.8.0

### Minor Changes

- cf59998: Update DB schema

### Patch Changes

- Updated dependencies [cf59998]
  - @prosopo/types-database@2.7.0
  - @prosopo/database@2.6.3
  - @prosopo/datasets@2.6.3
  - @prosopo/env@2.6.3
  - @prosopo/types-env@2.6.3

## 2.7.1

### Patch Changes

- Updated dependencies [6ff193a]
  - @prosopo/datasets@2.6.2
  - @prosopo/types@2.6.2
  - @prosopo/database@2.6.2
  - @prosopo/env@2.6.2
  - @prosopo/keyring@2.6.2
  - @prosopo/types-database@2.6.2
  - @prosopo/types-env@2.6.2
  - @prosopo/user-access-policy@2.6.2

## 2.7.0

### Minor Changes

- 39a9826: Updated JA4 extension hash generator

### Patch Changes

- 52feffc: Adjustable difficulty img captcha
- Updated dependencies [52feffc]
  - @prosopo/types-database@2.6.1
  - @prosopo/database@2.6.1
  - @prosopo/datasets@2.6.1
  - @prosopo/types@2.6.1
  - @prosopo/env@2.6.1
  - @prosopo/types-env@2.6.1
  - @prosopo/keyring@2.6.1
  - @prosopo/user-access-policy@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/config@2.6.0
  - @prosopo/api-express-router@2.6.0
  - @prosopo/api-route@2.6.0
  - @prosopo/common@2.6.0
  - @prosopo/database@2.6.0
  - @prosopo/datasets@2.6.0
  - @prosopo/env@2.6.0
  - @prosopo/keyring@2.6.0
  - @prosopo/types@2.6.0
  - @prosopo/types-database@2.6.0
  - @prosopo/types-env@2.6.0
  - @prosopo/user-access-policy@2.6.0
  - @prosopo/util@2.6.0
