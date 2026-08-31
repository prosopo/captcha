---
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/types": patch
---

Project the session fields callers read, and let routing machines set puzzle overrides.

`getSessionRecordBySessionId` lists its fields explicitly but declared a full `Session` return type. That type lie let callers read fields the projection never selected — they get `undefined`, with no error anywhere. This is the fourth time it has shipped: after the tcp-probe fields (verify-time TCP decide rules received `undefined` and never fired) and `clientMetaData` (#3141), this round found the entropy fingerprints plus the `g`/`i`/`sw`/`md`/`bn`/`fs` flags — which silently disabled the origin-session fallback in `getSessionRecordWithOriginFallback` *and* made it issue a redundant second query on every escalation, since every `needsX` check was trivially true and the origin read back `undefined` too — along with `ruleType` (fed into `DecisionMachineInput` by all three verify paths, so any decide rule gating on the matched access rule was dead), `powDifficulty` and `isProtect`.

Adds the 13 missing fields, then makes it structural: the projection is now `SESSION_PROJECTION` and the return type is derived from it as `ProjectedSession`, so reading an unprojected field is a compile error. The other three projected queries were audited and are correct; `getClientRecord` is safe by construction for the same reason, its return type being `Pick`-narrowed to match.

Separately, `RoutingMachineOutput` gains `puzzleTolerance` and `puzzle`, so a routing machine that inherits a trafficFilter `challenge` policy can reproduce it exactly. `getPuzzleCaptchaChallenge` re-derives its overrides from a live trafficFilter verdict, which a machine-chosen puzzle has no counterpart for, so the values are persisted on the session and layered in there. Both are bounded by the same field validators the portal uses.

Also: `deriveTrafficPolicies` forwards a site's per-category `trafficFilter` policies to routing and decision machines, so a machine can tell "the operator rejects this egress class" from "the operator deliberately accepts it"; `sendCaptcha` now persists the router's `reason`, which previously never reached the session on the route phase and was invisible in the portal; and `runArtifactExport`'s schema generic is corrected from `z.ZodSchema<T>` (which pins Input === Output === T, so any `.default()` in the tree made `T` unify with the input shape) to `z.ZodType<T, z.ZodTypeDef, unknown>`.
