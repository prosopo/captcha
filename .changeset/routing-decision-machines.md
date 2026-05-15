---
"@prosopo/types": minor
"@prosopo/provider": minor
---

Extend the existing decision-machine artifact with a new `route` phase that
selects the concrete captcha type during the frictionless flow. Per-sitekey
JS sources (Dapp > Global priority) can now override the ladder's image/pow
baseline based on Redis-backed usage counters keyed by IP and userAccount.

Adds:

- `RoutingMachineInput`, `RoutingMachineOutput`, `CounterSpec`,
  `CounterWindow` etc. in `@prosopo/types`.
- A `usageCounters` primitive in the provider (Lua INCR + TTL-on-first;
  bulk MGET) and fire-and-forget served/solved counter writes at the
  three captcha types.
- `DecisionMachineRunner.route()` and `.getRequiredCounters()` alongside
  the existing `decide()` veto. Artifact cache is now shared across all
  runner instances and busted on admin PUT for immediate propagation.
- `applyRouter` helper in the frictionless flow which falls back to the
  ladder baseline on any machine/Redis failure.

Back-compat: existing post-PoW verify-phase machines keep working
unchanged. A single artifact can export both `route` and `verify` /
`decide`.
