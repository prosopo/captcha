---
"@prosopo/provider": patch
---

Fix `computeFrictionlessScore` returning `NaN` when `scoreComponents` carries a non-numeric field.

The score was summed with `Object.values(...).reduce((acc, val) => acc + val, 0)` over every defined value. `ScoreComponents` also carries two non-numeric diagnostic fields — `triggeredDetectors` (`number[]`) and `shadowDomPenalty` (`boolean`) — and neither has an arithmetic weight anywhere in the scoring path. `+` on an array coerces the accumulator to a string, so any numeric component summed *after* an array turned the running total into string concatenation and the final `Math.min(1, ...)` into `NaN`:

```
0.42 + []    -> "0.42"
"0.42" + 0.3 -> "0.420.3"
Math.min(1, "0.420.3") -> NaN
```

This was reachable in production rather than theoretical. The Mongoose schema declares `triggeredDetectors` as an array path and Mongoose defaults array paths to `[]`, so the field is present on every session read back from the database even when the frictionless handler omitted it; the pow / puzzle / image tasks then spread `dnsAsymmetry` on afterwards, landing it after the array in key order. Every solve-time recompute on a session with `dnsAsymmetry > 0` produced `NaN`.

Only numeric values now contribute. `shadowDomPenalty` no longer silently adds a full `1.0` when true. A genuinely numeric `NaN` component still propagates — `typeof NaN === "number"`, so it survives the filter deliberately — because a score that cannot be computed must not read as a low one.

The recomputed value is not persisted (neither `sessions` nor `usercommitments` stores it) and no decide rule currently branches on `input.score`, so the impact to date was a `NaN` in the solve-time log line and in `DecisionMachineInput.score`.
