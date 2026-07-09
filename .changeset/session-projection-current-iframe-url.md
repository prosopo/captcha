---
"@prosopo/database": patch
---

Include `currentUrl` and `iframeUrl` in the `getSessionRecordBySessionId` projection so `buildEscalation` forwards them onto the escalated session. Without this, every post-PoW routed session was persisted with `currentUrl: undefined`, dropping URL attribution on the PoW → image/puzzle hop.
