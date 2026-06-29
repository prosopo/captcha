# @prosopo/user-access-policy

## 3.10.10
### Patch Changes

- Updated dependencies [8986976]
- Updated dependencies [970bca2]
  - @prosopo/types@4.9.1
  - @prosopo/util@3.3.3
  - @prosopo/api@3.5.7
  - @prosopo/common@3.1.42
  - @prosopo/logger@2.0.1
  - @prosopo/api-route@2.6.50
  - @prosopo/redis-client@1.0.27

## 3.10.9
### Patch Changes

- 7daea2e: chore(deps-dev): bump vitest from 3.2.4 to 3.2.6 in /packages/user-access-policy
- Updated dependencies [dfb0c53]
- Updated dependencies [7ebb78f]
- Updated dependencies [849af99]
- Updated dependencies [a5ba27b]
- Updated dependencies [948d36b]
- Updated dependencies [41e0e11]
- Updated dependencies [11f1e8c]
- Updated dependencies [3c80664]
- Updated dependencies [b166037]
- Updated dependencies [1111ff2]
- Updated dependencies [6a7b122]
  - @prosopo/common@3.1.41
  - @prosopo/logger@2.0.0
  - @prosopo/util@3.3.2
  - @prosopo/types@4.9.0
  - @prosopo/api@3.5.6
  - @prosopo/api-route@2.6.49
  - @prosopo/redis-client@1.0.26

## 3.10.8
### Patch Changes

- Updated dependencies [12cd0a6]
- Updated dependencies [12cd0a6]
  - @prosopo/api@3.5.5
  - @prosopo/types@4.8.0

## 3.10.7
### Patch Changes

- Updated dependencies [bb98af1]
  - @prosopo/types@4.7.4
  - @prosopo/api@3.5.4

## 3.10.6
### Patch Changes

- Updated dependencies [89ab6fc]
- Updated dependencies [0f3750b]
  - @prosopo/types@4.7.3
  - @prosopo/api@3.5.3

## 3.10.5
### Patch Changes

- e89860e: Add an indexed `type` field on the access-rules Redis index and a `blockOnly` filter on `findRules`. The request-time block middleware and the verify-time hard-block check now pre-filter the candidate pool to Block rules at the Redis layer, so dense Restrict / routing-Block populations can no longer push hard-block rules past the server-side ranking cap. Schema rehash triggers automatic index recreate on next provider start.
- Updated dependencies [edcd450]
- Updated dependencies [5295c4b]
  - @prosopo/util@3.3.1
  - @prosopo/types@4.7.2
  - @prosopo/logger@1.0.4
  - @prosopo/api@3.5.2
  - @prosopo/common@3.1.40
  - @prosopo/api-route@2.6.48
  - @prosopo/redis-client@1.0.25

## 3.10.4
### Patch Changes

- Updated dependencies [46fedf4]
  - @prosopo/types@4.7.1
  - @prosopo/api@3.5.1

## 3.10.3
### Patch Changes

- Updated dependencies [3a46191]
- Updated dependencies [dde23e8]
  - @prosopo/types@4.7.0
  - @prosopo/api@3.5.0

## 3.10.2
### Patch Changes

- 6962179: fix(user-access-policy): make findRulesRanked robust to typeless candidates and IPv6 numericIp
  
  Two production-fatal bugs in `findRulesRanked`, both surfacing as `failed to execute ranked search query` with empty results — i.e. no rules match the request and a Block rule that should fire is silently skipped.
  
  1. **Typeless candidates abort the aggregate.** `SEVERITY_EXPR = '(@type == "block")'` dereferenced `@type` directly, so any candidate document missing `type` triggered `Could not find the value for a parameter name, consider using EXISTS if applicable for type`. Sources of typeless candidates in production: stale RediSearch index entries pointing at a hash whose `type` was `HDEL`'d or whose key was `DEL`'d (visible after mass cleanups), and partial-write races in the writer. Fix: `FILTER exists(@type)` step at the start of the pipeline drops malformed candidates before any APPLY runs.
  
  2. **`FT.AGGREGATE LOAD` returns NUMERIC fields as doubles.** RediSearch stores NUMERIC values in the index as 8-byte doubles, so any `numericIp` / `numericIpMaskMin` / `numericIpMaskMax` past `Number.MAX_SAFE_INTEGER` (every IPv6 rule) round-tripped as scientific notation (`5.59112965392e+37`) and `z.coerce.bigint()` threw `Cannot convert … to a BigInt`. The hash itself preserves the full 38-digit string. Fix: use the aggregate purely as a ranker (it returns top-N keys by spec/severity); read the field values via `HGETALL` over those keys, same pattern as `findRulesGreedy`. One extra round-trip over ≤20 keys.
  
  Adds three regression tests: two simulate the typeless candidate via `HDEL` (single rule + co-resident valid rule), one inserts an IPv6 `numericIp` past `2**53` and asserts the bigint comes back intact. All three fail without the respective fix.
- Updated dependencies [4626340]
  - @prosopo/types@4.6.1
  - @prosopo/api@3.4.14

## 3.10.1
### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/util@3.3.0
  - @prosopo/types@4.6.0
  - @prosopo/logger@1.0.3
  - @prosopo/api@3.4.13
  - @prosopo/common@3.1.39
  - @prosopo/api-route@2.6.47
  - @prosopo/redis-client@1.0.24

## 3.10.0
### Minor Changes

- c1c7998: Server-side specificity rank for the access-rule lookup. Strict-match callers (the `blockMiddleware` and the verify-time `checkForHardBlock`) now issue one `FT.AGGREGATE` with `APPLY exists()` for specificity, `APPLY @type == "block"` for the severity tiebreak, `SORTBY @_rank DESC`, and `LIMIT 0 20`. Node receives at most 20 fully-populated rules — no follow-up HGETALL per candidate, no JS-side rank, no silent truncation past the LIMIT (which only applies after Redis has scored every candidate the strict filter returned).
  
  Supersedes both the v3.6.38 regression (`b520cd94c` — FT.AGGREGATE WITHCURSOR materialising ~1190 hashes per request, pegged provider1 at ~125% CPU on pronode10) and the 3.6.38-hotfix1 shape that reverted to FT.SEARCH (re-opened the 1000-candidate silent-truncation bug). The greedy/admin path (`matchingFieldsOnly=false`) keeps the FT.AGGREGATE+CURSOR approach with a generous `GREEDY_MAX_CANDIDATES` cap since those callers do not run on the per-request hot path.
  
  `packages/provider/src/api/blacklistRequestInspector.ts` flips `getPrioritisedAccessRule` to `matchingFieldsOnly: true` to engage the new path. The defensive JS `rankCandidateRules` is kept so any drift between the Redis-side score and the JS semantics surfaces as ordering, not as letting traffic through. New benchmark integration test seeds 10k rules across a realistic specificity distribution and asserts p50 < 80ms / p99 < 250ms over 200 lookups; local measurement is steady at p50 ≈ 20ms, p99 ≈ 24ms.

### Patch Changes

- Updated dependencies [9b91e85]
- Updated dependencies [c80a05b]
  - @prosopo/types@4.5.0
  - @prosopo/api@3.4.12

## 3.9.1
### Patch Changes

- b520cd9: Paginate the greedy `findRules` RediSearch query via `FT.AGGREGATE WITHCURSOR` so the candidate set is no longer truncated at `REDIS_BATCH_SIZE` (1000). Under high-volume bot traffic, a single popular ja4 fingerprint can be carried by thousands of rules; the OR-style greedy query returned > 1000 candidates and `FT.SEARCH`'s LIMIT silently dropped the tail — block rules emitted by less-frequent detectors sat past offset 1000 and never reached the JS-side specificity sort, letting matching requests through. Aggregation cursors return the full result set, so ranking sees every candidate.

## 3.9.0
### Minor Changes

- 4da8941: Add `deferToVerify` flag on `AccessPolicy` so a Block policy can skip the request-time `blockMiddleware` (no 401 at the captcha endpoint) and fire instead at the verify step. The behaviour mirrors the existing coords-rule deferral pattern: today the middleware blanks out coords from the userScope, so coords-only rules can only ever match in the verify path. `deferToVerify` is the explicit version of that for other signals (ja4Hash, headersHash, etc.) — useful when you want the attacker to pay the captcha-solving cost and the dApp to silently receive `{verified: false}` instead of the bot's frontend seeing a 401.
  
  Wiring:
  
  - `BlacklistRequestInspector.shouldAbortRequest` filters out matching policies that have `deferToVerify` before picking the top hit. Those policies never short-circuit the middleware.
  - `CaptchaManager.findHardBlockPolicy` widens its matcher: a Block policy now counts as a hard block when it has either no `captchaType` (existing behaviour) **or** `deferToVerify === true`. The check is invoked from `imgCaptchaTasks.dappUserSolution`, `powTasks.serverVerifyPowCaptcha`, and `puzzleTasks.verifyPuzzleCaptchaSolution`, so the deferral applies to all three captcha types.
  - Persistence: `deferToVerify` lands on the mongo `accessPolicySchema` (Boolean) and the zod `accessPolicyInput` (with a string→boolean preprocess so the Redis round-trip works).
  
  Motivating use case: a set of spoofed-JA4 hard-block rules pushed 2026-06-12. Marking those `deferToVerify: true` would still reject the attacker at verify but force them to complete N image captcha rounds and surface behavioural data on the commitment record before the rejection — useful for both telemetry and operator-side friction.

### Patch Changes

- 70ef67a: Add explicit `ZodType<T, ZodTypeDef, unknown>` annotations to `accessRuleInput`, `ruleEntryInput`, and `fetchRulesResponse`. The `z.preprocess` on `deferToVerify` widens the input position to `unknown`; without an explicit annotation TS emits an unnameable inferred type and parent repos that import these schemas fail typecheck with TS2742.
- 4226c59: Support IPv6 in access rule input transforms.
  
  The portal-side ticket [prosopo/captcha-private#3379](https://github.com/prosopo/captcha-private/issues/3379) enables IPv6 rule creation. The CIDR parser in `userScopeInput` and the numeric→string reverse path in `transformRule` were both IPv4-only and would crash or produce wrong addresses when an IPv6 rule reached the provider.
  
  - `userScopeInput.ts`: dispatch CIDR parsing to `Address4` vs `Address6` via `Address4.isValid`; both expose `startAddress()/endAddress().bigInt()`.
  - `transformRule.ts`: `getStringIpFromNumeric` now uses `Address6.fromBigInt(...).correctForm()` for numeric values above `2^32 - 1`, keeping `Address4.fromInteger(...)` for IPv4 range.
  - Adds a round-trip unit test for `2001:db8::1` + `/32` mask, plus three IPv6 CIDR cases (`/32`, `/64`, `/10`) alongside the existing IPv4 set.
- Updated dependencies [f69724f]
- Updated dependencies [3973078]
  - @prosopo/types@4.4.1
  - @prosopo/api@3.4.11

## 3.8.1
### Patch Changes

- Updated dependencies [bc3813d]
- Updated dependencies [4d05e3f]
  - @prosopo/types@4.4.0
  - @prosopo/api@3.4.10

## 3.8.0
### Minor Changes

- 2f459ce: Add `asn` as a user-scope field for access rules. The captcha provider can now block / restrict by Autonomous System Number, matching what the protect/bumblebee tier already supports. ASN is read from `ipInfo.asnNumber` and threaded through `getRequestUserScope` and `checkForHardBlock` at all challenge entry points. Redis index gains a NUMERIC `asn` field with range-syntax lookups.

## 3.7.12
### Patch Changes

- Updated dependencies [b03dad1]
  - @prosopo/types@4.3.1
  - @prosopo/api@3.4.9

## 3.7.11
### Patch Changes

- Updated dependencies [a1d60db]
- Updated dependencies [2392aaf]
- Updated dependencies [97cf7bd]
- Updated dependencies [6ca1125]
- Updated dependencies [32a591b]
  - @prosopo/types@4.3.0
  - @prosopo/logger@1.0.2
  - @prosopo/util@3.2.15
  - @prosopo/api@3.4.8
  - @prosopo/common@3.1.38
  - @prosopo/api-route@2.6.46
  - @prosopo/redis-client@1.0.23

## 3.7.10
### Patch Changes

- Updated dependencies [6c26669]
- Updated dependencies [f7f9ec5]
  - @prosopo/types@4.2.1
  - @prosopo/api@3.4.7

## 3.7.9
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.
- Updated dependencies [0fd81af]
  - @prosopo/api-route@2.6.45
  - @prosopo/common@3.1.37
  - @prosopo/logger@1.0.1
  - @prosopo/redis-client@1.0.22

## 3.7.8
### Patch Changes

- Updated dependencies [20cae63]
- Updated dependencies [4d9923e]
  - @prosopo/types@4.2.0
  - @prosopo/api@3.4.6

## 3.7.7
### Patch Changes

- Updated dependencies [d351362]
  - @prosopo/types@4.1.4
  - @prosopo/api@3.4.5

## 3.7.6
### Patch Changes

- Updated dependencies [6567ce0]
- Updated dependencies [e2711ae]
- Updated dependencies [5786629]
  - @prosopo/util@3.2.14
  - @prosopo/types@4.1.3
  - @prosopo/api@3.4.4
  - @prosopo/common@3.1.36
  - @prosopo/api-route@2.6.44
  - @prosopo/redis-client@1.0.21

## 3.7.5
### Patch Changes

- Updated dependencies [72a1218]
  - @prosopo/util@3.2.13
  - @prosopo/types@4.1.2
  - @prosopo/api@3.4.3

## 3.7.4
### Patch Changes

- Updated dependencies [91958da]
  - @prosopo/api@3.4.2
  - @prosopo/types@4.1.1
  - @prosopo/common@3.1.35
  - @prosopo/api-route@2.6.43
  - @prosopo/redis-client@1.0.20

## 3.7.3
### Patch Changes

- Updated dependencies [6a741ce]
  - @prosopo/types@4.1.0
  - @prosopo/api@3.4.1

## 3.7.2
### Patch Changes

- 72a0483: User Access Policy (UAP) rule endpoints now use the per-request logger
  passed by the express adapter, instead of the long-lived app logger
  captured at construction time. This means every "Endpoint inserted access
  rules" / "Endpoint fetched rules" / "Endpoint deleted rules" / etc. log
  line now carries `requestId`, `siteKey`, and `user`, matching the rest of
  the provider API and making the logs queryable per-request in OpenObserve.
  
  Each `processRequest(args, logger?)` resolves to the request logger when
  present and falls back to `this.logger` otherwise, preserving behaviour
  when called directly (e.g. from a script or unit test that doesn't pass
  a logger). The express adapter at
  `api-express-router/.../apiExpressDefaultEndpointAdapter.ts` already
  passes `request.logger` — no router-level changes needed.
  
  Touched endpoints (all under `packages/user-access-policy/src/api/`):
  `InsertRulesEndpoint`, `RehashRulesEndpoint`, `FetchRulesEndpoint`,
  `FindRuleIdsEndpoint`, `GetMissingIdsEndpoint`, `DeleteRulesEndpoint`,
  `DeleteAllRulesEndpoint`, `DeleteRuleGroupsEndpoint`.
- Updated dependencies [3c0be68]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [d865319]
- Updated dependencies [753304b]
- Updated dependencies [8bb7286]
- Updated dependencies [f9ea09d]
- Updated dependencies [4aae4e6]
- Updated dependencies [4993813]
  - @prosopo/types@4.0.0
  - @prosopo/api@3.4.0
  - @prosopo/util@3.2.12
  - @prosopo/common@3.1.34
  - @prosopo/api-route@2.6.42
  - @prosopo/redis-client@1.0.19

## 3.7.1
### Patch Changes

- Updated dependencies [819ed95]
  - @prosopo/types@3.16.1
  - @prosopo/api@3.3.2

## 3.7.0
### Minor Changes

- 60ba3b1: Fix for rules that expire before being removed from index.

## 3.6.24
### Patch Changes

- Updated dependencies [f6a4402]
- Updated dependencies [99dfb44]
  - @prosopo/types@3.16.0
  - @prosopo/api@3.3.1

## 3.6.23
### Patch Changes

- Updated dependencies [3e54c0a]
  - @prosopo/types@3.15.0
  - @prosopo/api@3.3.0

## 3.6.22
### Patch Changes

- Updated dependencies [946a8ba]
- Updated dependencies [5614814]
  - @prosopo/types@3.14.1
  - @prosopo/api@3.2.11
  - @prosopo/common@3.1.33
  - @prosopo/api-route@2.6.41
  - @prosopo/redis-client@1.0.18

## 3.6.21
### Patch Changes

- Updated dependencies [fc514dd]
- Updated dependencies [7be39c4]
- Updated dependencies [42650db]
  - @prosopo/types@3.14.0
  - @prosopo/api@3.2.10
  - @prosopo/common@3.1.32
  - @prosopo/api-route@2.6.40
  - @prosopo/redis-client@1.0.17

## 3.6.20
### Patch Changes

- Updated dependencies [4a9c518]
  - @prosopo/common@3.1.31
  - @prosopo/api-route@2.6.39
  - @prosopo/redis-client@1.0.16

## 3.6.19
### Patch Changes

- Updated dependencies [a25dffa]
  - @prosopo/util@3.2.11
  - @prosopo/types@3.13.3
  - @prosopo/api@3.2.9

## 3.6.18
### Patch Changes

- Updated dependencies [346edd7]
  - @prosopo/util@3.2.10
  - @prosopo/types@3.13.2
  - @prosopo/api@3.2.8

## 3.6.17
### Patch Changes

- Updated dependencies [22bfee7]
  - @prosopo/util@3.2.9
  - @prosopo/types@3.13.1
  - @prosopo/api@3.2.7

## 3.6.16
### Patch Changes

- Updated dependencies [e0fb3d6]
- Updated dependencies [e6d9553]
- Updated dependencies [f3f23e3]
  - @prosopo/util@3.2.8
  - @prosopo/types@3.13.0
  - @prosopo/api@3.2.6

## 3.6.15
### Patch Changes

- Updated dependencies [d5082a9]
- Updated dependencies [e1ea65f]
- Updated dependencies [c316257]
  - @prosopo/types@3.12.3
  - @prosopo/util@3.2.7
  - @prosopo/api@3.2.5

## 3.6.14
### Patch Changes

- Updated dependencies [adb89a6]
  - @prosopo/types@3.12.2
  - @prosopo/util@3.2.6
  - @prosopo/api@3.2.4
  - @prosopo/common@3.1.30
  - @prosopo/api-route@2.6.38
  - @prosopo/redis-client@1.0.15

## 3.6.13
### Patch Changes

- Updated dependencies [c5ee492]
- Updated dependencies [a90eb54]
  - @prosopo/common@3.1.29
  - @prosopo/types@3.12.1
  - @prosopo/api-route@2.6.37
  - @prosopo/redis-client@1.0.14
  - @prosopo/api@3.2.3

## 3.6.12
### Patch Changes

- Updated dependencies [676c5f2]
- Updated dependencies [feaca02]
  - @prosopo/types@3.12.0
  - @prosopo/api@3.2.2

## 3.6.11
### Patch Changes

- Updated dependencies [8148587]
  - @prosopo/types@3.11.1
  - @prosopo/api@3.2.1

## 3.6.10
### Patch Changes

- Updated dependencies [7f6ffc5]
  - @prosopo/types@3.11.0
  - @prosopo/api@3.2.0

## 3.6.9
### Patch Changes

- Updated dependencies [93fa086]
  - @prosopo/types@3.10.2
  - @prosopo/api@3.1.49

## 3.6.8
### Patch Changes

- Updated dependencies [cde7550]
  - @prosopo/types@3.10.1
  - @prosopo/api@3.1.48

## 3.6.7
### Patch Changes

- Updated dependencies [ad6d622]
  - @prosopo/types@3.10.0
  - @prosopo/api@3.1.47

## 3.6.6
### Patch Changes

- Updated dependencies [ff58a70]
  - @prosopo/types@3.9.0
  - @prosopo/api@3.1.46

## 3.6.5
### Patch Changes

- Updated dependencies [d2431cd]
  - @prosopo/types@3.8.4
  - @prosopo/api@3.1.45

## 3.6.4
### Patch Changes

- bd6995b: Adding UAP based geoblocking rules
- Updated dependencies [bd6995b]
  - @prosopo/types@3.8.3
  - @prosopo/api@3.1.44

## 3.6.3
### Patch Changes

- Updated dependencies [9633e58]
  - @prosopo/types@3.8.2
  - @prosopo/api@3.1.43

## 3.6.2
### Patch Changes

- Updated dependencies [f52a5c1]
  - @prosopo/types@3.8.1
  - @prosopo/api@3.1.42

## 3.6.1
### Patch Changes

- ed87b6f: Fix authentication in uaps

## 3.6.0
### Minor Changes

- 17854a7: fix deleteAll endpoint throwing a recursion limit when too many rules are in redis

### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 3acc333: Release 3.3.0
- Updated dependencies [a53526b]
- Updated dependencies [3acc333]
- Updated dependencies [0a38892]
- Updated dependencies [1ee3d80]
- Updated dependencies [a8faa9a]
- Updated dependencies [7543d17]
- Updated dependencies [3acc333]
  - @prosopo/util@3.2.5
  - @prosopo/types@3.8.0
  - @prosopo/redis-client@1.0.13
  - @prosopo/api-route@2.6.36
  - @prosopo/common@3.1.28
  - @prosopo/api@3.1.41

## 3.5.37
### Patch Changes

- 378a896: Fix: Remove captchaType and solvedImagesCount from block access policies. Block policies should not store these fields as they are only relevant for restrict policies that present captcha challenges.
- 90fddd8: Fix UAP expiry timestamp handling: missing propagation and unit conversion. Timestamps are now correctly propagated when policyScopes are present, and milliseconds are properly converted to seconds for Redis expireAt.

## 3.5.36
### Patch Changes

- 7c475dc: Add headHash and coords fields to user access policies, and implement user access policy checks in server-side PoW verification

## 3.5.35
### Patch Changes

- Updated dependencies [141e462]
  - @prosopo/types@3.7.2
  - @prosopo/api@3.1.40

## 3.5.34
### Patch Changes

- Updated dependencies [345b25b]
  - @prosopo/types@3.7.1
  - @prosopo/api@3.1.39

## 3.5.33
### Patch Changes

- Updated dependencies [ce70a2b]
- Updated dependencies [c2b940f]
- Updated dependencies [f6b5094]
  - @prosopo/types@3.7.0
  - @prosopo/api@3.1.38
  - @prosopo/common@3.1.27
  - @prosopo/api-route@2.6.35
  - @prosopo/redis-client@1.0.12

## 3.5.32
### Patch Changes

- 7d5eb3f: bump
- Updated dependencies [7d5eb3f]
  - @prosopo/api@3.1.37
  - @prosopo/api-route@2.6.34
  - @prosopo/common@3.1.26
  - @prosopo/redis-client@1.0.11
  - @prosopo/types@3.6.4
  - @prosopo/util@3.2.4

## 3.5.31
### Patch Changes

- 93d92a7: little bump for publish all
- Updated dependencies [93d92a7]
  - @prosopo/api@3.1.36
  - @prosopo/api-route@2.6.33
  - @prosopo/common@3.1.25
  - @prosopo/redis-client@1.0.10
  - @prosopo/types@3.6.3
  - @prosopo/util@3.2.3

## 3.5.30
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- Updated dependencies [8ee8434]
- Updated dependencies [cfee479]
  - @prosopo/redis-client@1.0.9
  - @prosopo/api-route@2.6.32
  - @prosopo/common@3.1.24
  - @prosopo/types@3.6.2
  - @prosopo/util@3.2.2
  - @prosopo/api@3.1.35

## 3.5.29
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/api@3.1.34
  - @prosopo/api-route@2.6.31
  - @prosopo/common@3.1.23
  - @prosopo/redis-client@1.0.8
  - @prosopo/types@3.6.1
  - @prosopo/util@3.2.1

## 3.5.28
### Patch Changes

- 8ce9205: enhance/uap-rules-push
- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [15ae7cf]
- Updated dependencies [bb5f41c]
- Updated dependencies [8ce9205]
- Updated dependencies [b6e98b2]
  - @prosopo/types@3.6.0
  - @prosopo/util@3.2.0
  - @prosopo/redis-client@1.0.7
  - @prosopo/api-route@2.6.30
  - @prosopo/common@3.1.22
  - @prosopo/api@3.1.33

## 3.5.27
### Patch Changes

- Updated dependencies [8f1773a]
  - @prosopo/types@3.5.11
  - @prosopo/api@3.1.32

## 3.5.26
### Patch Changes

- Updated dependencies [cb8ab85]
  - @prosopo/types@3.5.10
  - @prosopo/api@3.1.31

## 3.5.25
### Patch Changes

- 005ce66: Split load balancer into URL fn and getter fn for private repo
- Updated dependencies [43907e8]
- Updated dependencies [005ce66]
- Updated dependencies [7101036]
  - @prosopo/types@3.5.9
  - @prosopo/util@3.1.7
  - @prosopo/api@3.1.30

## 3.5.24
### Patch Changes

- Updated dependencies [e5c259d]
  - @prosopo/types@3.5.8
  - @prosopo/api@3.1.29

## 3.5.23
### Patch Changes

- c9d8fdf: feat/access-policy-group
- b8185a4: feat/uap-rules-syncer
- Updated dependencies [c9d8fdf]
- Updated dependencies [b8185a4]
  - @prosopo/api@3.1.28
  - @prosopo/common@3.1.21
  - @prosopo/api-route@2.6.29
  - @prosopo/redis-client@1.0.6
  - @prosopo/types@3.5.7
  - @prosopo/util@3.1.6

## 3.5.22
### Patch Changes

- Updated dependencies [5d11a81]
  - @prosopo/types@3.5.6
  - @prosopo/api@3.1.27

## 3.5.21
### Patch Changes

- Updated dependencies [494c5a8]
  - @prosopo/types@3.5.5
  - @prosopo/api@3.1.26

## 3.5.20
### Patch Changes

- Updated dependencies [08ff50f]
  - @prosopo/types@3.5.4
  - @prosopo/api@3.1.25

## 3.5.19
### Patch Changes

  - @prosopo/api@3.1.24
  - @prosopo/api-route@2.6.28
  - @prosopo/common@3.1.20
  - @prosopo/redis-client@1.0.5
  - @prosopo/types@3.5.3
  - @prosopo/util@3.1.5

## 3.5.18
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [f912439]
- Updated dependencies [5659b24]
  - @prosopo/common@3.1.19
  - @prosopo/redis-client@1.0.4
  - @prosopo/api-route@2.6.27
  - @prosopo/types@3.5.2
  - @prosopo/util@3.1.4
  - @prosopo/api@3.1.23

## 3.5.17
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [52cd544]
- Updated dependencies [b117ba3]
- Updated dependencies [50c4120]
  - @prosopo/types@3.5.1
  - @prosopo/redis-client@1.0.3
  - @prosopo/api-route@2.6.26
  - @prosopo/common@3.1.18
  - @prosopo/util@3.1.3
  - @prosopo/api@3.1.22

## 3.5.16
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
- Updated dependencies [e20ad6b]
  - @prosopo/redis-client@1.0.2
  - @prosopo/api-route@2.6.25
  - @prosopo/common@3.1.17
  - @prosopo/types@3.5.0
  - @prosopo/util@3.1.2
  - @prosopo/api@3.1.21

## 3.5.15
### Patch Changes

- 11303d9: feat/pluggable-redis
- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- 11303d9: feat/pluggable-redis
- Updated dependencies [11303d9]
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
- Updated dependencies [11303d9]
  - @prosopo/redis-client@1.0.1
  - @prosopo/api-route@2.6.24
  - @prosopo/common@3.1.16
  - @prosopo/types@3.4.1
  - @prosopo/util@3.1.1
  - @prosopo/api@3.1.20

## 3.5.14
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
- Updated dependencies [6768f14]
  - @prosopo/api-route@2.6.23
  - @prosopo/common@3.1.15
  - @prosopo/types@3.4.0
  - @prosopo/util@3.1.0
  - @prosopo/config@3.1.15

## 3.5.13
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies [97edf3f]
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/types@3.3.0
  - @prosopo/api-route@2.6.22
  - @prosopo/common@3.1.14
  - @prosopo/util@3.0.17
  - @prosopo/config@3.1.14

## 3.5.12
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [509be28]
- Updated dependencies [008d112]
  - @prosopo/types@3.2.1
  - @prosopo/api-route@2.6.21
  - @prosopo/common@3.1.13
  - @prosopo/util@3.0.16
  - @prosopo/config@3.1.13

## 3.5.11
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [cf48565]
- Updated dependencies [0824221]
  - @prosopo/types@3.2.0
  - @prosopo/api-route@2.6.20
  - @prosopo/common@3.1.12
  - @prosopo/util@3.0.15
  - @prosopo/config@3.1.12

## 3.5.10
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [0d1a33e]
- Updated dependencies [0d1a33e]
- Updated dependencies [1a23649]
  - @prosopo/types@3.1.4
  - @prosopo/api-route@2.6.19
  - @prosopo/common@3.1.11
  - @prosopo/util@3.0.14
  - @prosopo/config@3.1.11

## 3.5.9
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/api-route@2.6.18
  - @prosopo/common@3.1.10
  - @prosopo/types@3.1.3
  - @prosopo/util@3.0.13
  - @prosopo/config@3.1.10

## 3.5.8
### Patch Changes

- 4440947: fix type-only tsc compilation
- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [1249ce0]
- Updated dependencies [809b984]
  - @prosopo/api-route@2.6.17
  - @prosopo/common@3.1.9
  - @prosopo/types@3.1.2
  - @prosopo/util@3.0.12
  - @prosopo/config@3.1.9

## 3.5.7
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [1f980c4]
- Updated dependencies [6fe8570]
  - @prosopo/types@3.1.1
  - @prosopo/api-route@2.6.16
  - @prosopo/common@3.1.8
  - @prosopo/util@3.0.11
  - @prosopo/config@3.1.8

## 3.5.6
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
- Updated dependencies [8bdc7f0]
  - @prosopo/api-route@2.6.15
  - @prosopo/common@3.1.7
  - @prosopo/types@3.1.0
  - @prosopo/util@3.0.10
  - @prosopo/config@3.1.7

## 3.5.5
### Patch Changes

- a07db04: Release 3.1.12
- Updated dependencies [9eed772]
- Updated dependencies [ebb0168]
  - @prosopo/config@3.1.6
  - @prosopo/util@3.0.9
  - @prosopo/api-route@2.6.14
  - @prosopo/common@3.1.6
  - @prosopo/types@3.0.10

## 3.5.4
### Patch Changes

- 553025d: Index

## 3.5.3
### Patch Changes

- 6960643: lint detect missing and unneccessary imports
- Updated dependencies [6960643]
  - @prosopo/api-route@2.6.13
  - @prosopo/common@3.1.5
  - @prosopo/types@3.0.9
  - @prosopo/util@3.0.8

## 3.5.2
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5
  - @prosopo/api-route@2.6.12
  - @prosopo/common@3.1.4
  - @prosopo/types@3.0.8
  - @prosopo/util@3.0.7

## 3.5.1
### Patch Changes

- 1f3a02f: Release 3.1.8

## 3.5.0
### Minor Changes

- e0628d9: Make sure rules don't leak between IPs

## 3.4.1
### Patch Changes

- a49b538: Extra tests
- e090e2f: More tests
- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4
  - @prosopo/common@3.1.3
  - @prosopo/api-route@2.6.11
  - @prosopo/types@3.0.7
  - @prosopo/util@3.0.6

## 3.4.0
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
  - @prosopo/api-route@2.6.10
  - @prosopo/common@3.1.2
  - @prosopo/types@3.0.6
  - @prosopo/config@3.1.3
  - @prosopo/util@3.0.5

## 3.3.2
### Patch Changes

- eb71691: configure typecheck before bundle for vue packages
- eb71691: make typecheck script always recompile
- Updated dependencies [eb71691]
- Updated dependencies [eb71691]
  - @prosopo/api-route@2.6.9
  - @prosopo/common@3.1.1
  - @prosopo/types@3.0.5
  - @prosopo/util@3.0.4
  - @prosopo/config@3.1.2

## 3.3.1
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
  - @prosopo/types@3.0.4
  - @prosopo/api-route@2.6.8
  - @prosopo/common@3.1.0
  - @prosopo/config@3.1.1

## 3.3.0
### Minor Changes

- b7c3258: Add tests for UAPs

## 3.2.1
### Patch Changes

- cdf7c29: Fix var

## 3.2.0
### Minor Changes

- a7164ce: Allow searching for more rules to make deleting rules easier. Fix the expiry times of rules

## 3.1.5
### Patch Changes

- Updated dependencies [b0d7207]
  - @prosopo/types@3.0.3

## 3.1.4
### Patch Changes

  - @prosopo/util@3.0.2

## 3.1.3
### Patch Changes

  - @prosopo/util@3.0.1

## 3.1.2
### Patch Changes

- Updated dependencies [f682f0c]
  - @prosopo/types@3.0.2
  - @prosopo/common@3.0.2
  - @prosopo/api-route@2.6.7

## 3.1.1
### Patch Changes

  - @prosopo/common@3.0.1
  - @prosopo/types@3.0.1
  - @prosopo/api-route@2.6.6

## 3.1.0
### Minor Changes

- 913f2a6: Make custom expiration times work in redis. Make redis internal only and persist data

## 3.0.0
### Major Changes

- 64b5bcd: Access Controls

### Patch Changes

- Updated dependencies [64b5bcd]
  - @prosopo/common@3.0.0
  - @prosopo/types@3.0.0
  - @prosopo/util@3.0.0
  - @prosopo/api-route@2.6.5

## 2.6.8
### Patch Changes

- Updated dependencies [aee3efe]
  - @prosopo/types@2.10.0

## 2.6.7
### Patch Changes

- 86c22b8: structured logging
- Updated dependencies [86c22b8]
  - @prosopo/api-route@2.6.4
  - @prosopo/common@2.7.2
  - @prosopo/types@2.9.1

## 2.6.6
### Patch Changes

- Updated dependencies [30bb383]
  - @prosopo/types@2.9.0
  - @prosopo/common@2.7.1
  - @prosopo/api-route@2.6.3

## 2.6.5
### Patch Changes

- Updated dependencies [8f0644a]
  - @prosopo/common@2.7.0
  - @prosopo/types@2.8.0
  - @prosopo/api-route@2.6.2

## 2.6.4

### Patch Changes

- Updated dependencies [04cc7ee]
  - @prosopo/common@2.6.1
  - @prosopo/api-route@2.6.1
  - @prosopo/types@2.7.1

## 2.6.3

### Patch Changes

- Updated dependencies [6e1aef6]
  - @prosopo/types@2.7.0

## 2.6.2

### Patch Changes

- Updated dependencies [6ff193a]
  - @prosopo/types@2.6.2

## 2.6.1

### Patch Changes

- Updated dependencies [52feffc]
  - @prosopo/types@2.6.1

## 2.6.0

### Minor Changes

- a0bfc8a: bump all pkg versions since independent versioning applied

### Patch Changes

- Updated dependencies [a0bfc8a]
  - @prosopo/api-route@2.6.0
  - @prosopo/common@2.6.0
  - @prosopo/types@2.6.0
