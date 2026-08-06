---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
"@prosopo/types": patch
---

feat(provider,database,types): session chain — escalations reference origin, DM-input reads walk back for missing fields

Adds `originSessionId` to the Session schema and populates it on escalation sessions in `submitPoWCaptchaSolution.buildEscalation`. Adds `CaptchaManager.getSessionRecordWithOriginFallback` — a session reader that, when the record is an escalation missing an inherently-origin-populated field (`simdReadings`, `dnsEvent`, `entropyMathRandom*`, `entropyCrypto*`, `entropyWallClockOffsetMs`), reads the origin session and fills the gap. Escalation-owned fields (`captchaType`, `sessionId`, `score`, `ipInfo`, `headers`, etc.) are never overridden.

The three `serverVerify*CaptchaSolution` methods now use the walker instead of the raw `getSessionRecordBySessionId`, so decision-machine inputs on escalated puzzle / image sessions see the origin's SIMD readings and DNS event.

Fixes the write-time race between (a) the origin's fire-and-forget SIMD attach via `scheduleMongoSimdReadingsUpdate` on pow-submit, and (b) `buildEscalation`'s immediate Mongo read — which left ~97% of escalation sessions with no `dnsEvent` and ~97% with no `simdReadings`, in turn tripping decide-machine deny rules (SIMD_ABSENT etc.) on legit escalation flows.

Non-escalation sessions and older escalation records without `originSessionId` fall through as a no-op — no behavior change. Extra Mongo read only fires when the escalation is actually missing a fallback-eligible field.
