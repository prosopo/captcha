---
"@prosopo/cli": patch
---

Provider deployments now define provider1 and provider2 from one shared block, and both always pull their image. Mongo and Redis no longer have host ports and sit on a private network that only their users can join. Development and test compose files bind datastores to localhost only.
