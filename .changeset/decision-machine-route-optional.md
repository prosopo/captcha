---
"@prosopo/provider": patch
---

Stop logging an error per request when a decision machine has no `route` export.

PR #2543 added a routing pre-phase that calls `route()` on whichever decision
machine is selected for the dapp. The runner's export lookup only treats
`module.exports = fn` as a default for `decide`/`default`, so decide-only
machines (the in-prod shape: a bare default function) caused `route()` to
throw `Decision machine must export one of: route` on every verify request.

Behaviour was already correct — the caller catches and falls back to the
baseline — but the per-request error log was noisy. Pass `optional: true`
when looking up the `route` export so a missing one returns `undefined`
silently, matching how `requiredCounters` is already handled. Schema
validation failures, throws, and timeouts continue to log an error.
