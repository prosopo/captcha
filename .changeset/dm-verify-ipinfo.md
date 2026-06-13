---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Expose `ipInfo` to the verify-phase decision machine. The frictionless DM already gets the full `IPInfoResponse`; the verify-phase DM was only receiving `countryCode`, so rules that need `isDatacenter`, `isVPN`, `isAbuser`, `asnNumber` etc. couldn't run at submission time.

`DecisionMachineInput` now carries an optional `ipInfo` field (alongside `countryCode`, which is kept for backwards compatibility). The three verify-phase call sites — `powTasks`, `puzzleTasks`, `imgCaptchaTasks` — forward `challengeRecord.ipInfo` / `solution.ipInfo` into the input.

This unblocks rules like:
```
if (input.behavioralDataPacked &&
    !input.behavioralDataPacked.c1.length &&
    !input.behavioralDataPacked.c2.length &&
    !input.behavioralDataPacked.c3.length &&
    input.ipInfo?.isDatacenter) return Deny;
```
which catches the datacenter-class bots (Sparkle, Versatel, OVH) that submit empty `behavioralDataPacked` — observed at 100% empty-bDP across a 21-row Sparkle sample, versus 1–3% in genuine traffic.
