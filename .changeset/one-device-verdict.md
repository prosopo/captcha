---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/cli": patch
---

Decide whether a visitor is on a phone in one place, from the same inputs, wherever the provider needs to know.

Frictionless routing, post-PoW routing, the decision machines, puzzle sizing on escalation and puzzle issuance each built that verdict themselves, and fed it different evidence. Post-PoW routing judged the device before the solve was decrypted, so the touch readings the solve carried never counted, while the escalation that followed judged it again with them included. They now share `deriveDevice`, which takes the user agent, client hints, IP lookup, packet size, in-app flag and, wherever a solve exists, what that solve said about the input device. Post-PoW routing computes it once and the escalation reuses it. An escalated session keeps the solve's two device readings, so a puzzle issued for it judges the same device.

An iPad that sends a Mac user agent but taps with a finger can now be recognised from its taps after a solve. The weighing itself is unchanged: a touchscreen laptop, or a phone browser asking for the desktop site, still counts as a desktop.
