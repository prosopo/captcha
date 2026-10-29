---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

A traffic-filter exception can now be conditioned on whether the IP is on a mobile network (`mobile: true` or `mobile: false`). This lets a site block high-scoring proxies everywhere except on carrier networks, where one shared address carries real phones alongside the rented SIMs that put it on proxy lists.
