---
"@prosopo/provider": minor
"@prosopo/types": minor
---

Allow maintenance mode to be scoped to specific site keys.

Maintenance mode was all-or-nothing for a whole provider process. If one
customer's traffic needed to be taken out of scoring, the only option was to put
the entire node into maintenance mode, which forces a pass for every other
customer on it too — so in practice it was not used.

The admin toggle now accepts an optional `siteKeys` list. With it, only those
keys are taken out of scoring and the node-wide flag is left untouched; without
it, the behaviour is exactly as before, which is what the deploy path relies on.

Scoped maintenance mode is applied in the verify handlers only after the dapp
signature has been checked, so the decision is made on a site key the caller has
proven it owns rather than one it merely asserted.

Same durability as the existing flag: per-process, cleared on restart, and set
per node.
