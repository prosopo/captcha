---
"@prosopo/database": patch
---

fix(database): widen `getSessionRecordBySessionId` projection so post-PoW routing escalations stop failing with `DATABASE.SESSION_STORE_FAILED`. The projection added in #2393 dropped `token`, `score`, `threshold`, `providerSelectEntropy`, `ipAddress`, etc., which `buildEscalation` forwards into a new session via `frictionlessManager.createSession`. With routing machines enabled for edge (2026-06-16) every escalation 500'd. Headers are now enumerated key-by-key so `headers.x-tls-clienthello` (multi-KB TLS ClientHello) stays out of the read.
