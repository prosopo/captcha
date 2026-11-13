---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Decision machines can now read the session's WebRTC signal: routing machines as `raw.webrtc`, and verify-time decide rules as `webrtc`. The post-solve routing pass and escalated sessions carry it from the session where it was gathered.
