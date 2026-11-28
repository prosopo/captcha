---
"@prosopo/types": minor
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

Add a per-site `detectionRuleActions` setting that decision machines read at routing and verify time. Rules a site has in shadow mode are saved on the session as `shadowRules`. The stored WebRTC signal now also keeps the network name of the leaked address.
