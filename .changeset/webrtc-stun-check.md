---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/api": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/provider": minor
"@prosopo/cli": minor
---

Check where a browser's WebRTC traffic comes from. When a provider runs the stun-probe sidecar, it gives the widget a STUN address. The widget gathers WebRTC candidates while detection runs and sends them with the frictionless request. The provider asks stun-probe whether the STUN request really arrived and from which address, and stores the result on the session. A mismatch with the HTTP address means the HTTP traffic went through a proxy that the UDP traffic skipped. Only the outcome and the leaked address's network are stored, never the address. Nothing routes on it yet.
