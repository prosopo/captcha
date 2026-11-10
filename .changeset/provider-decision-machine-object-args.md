---
"@prosopo/provider": patch
---

`updateDecisionMachine` now takes one object. Its type requires a dapp account whenever the scope is dapp, so that check now happens when the request is parsed instead of inside the method.
