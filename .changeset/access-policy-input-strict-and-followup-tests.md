---
"@prosopo/user-access-policy": patch
"@prosopo/provider": patch
---

fix(access-policy): reject Block+captchaType at schema level; add follow-up test coverage

**Fix.** The `sanitizeAccessPolicy` helper silently strips `captchaType` and `solvedImagesCount` from Block policies at write time, which meant operators writing e.g. `--block --ip X --captchaType image` got a rule that actually blocked EVERY captcha type for that IP — not just image. Same root cause as the Block+deferToVerify request-time 400 bug (see #2885). Rejecting at input surfaces the mismatch loudly with a message that points the operator at Restrict:

```
Block policies cannot pin a captchaType — Block always applies to every
captcha type. Use a Restrict policy if you want to narrow the effect to
one captcha type.
```

`accessPolicyInput` now has a `superRefine` that rejects Block+captchaType and Block+solvedImagesCount. The read path still accepts the legacy shape (records written before the refinement landed can still be parsed by the reader). The `addUserAccessPolicy` script was updated to only emit those fields for Restrict, so its `--block` path no longer 400s.

**Follow-up tests added** — closing the gaps flagged in the previous session:

- **Coord threading lands on the puzzle record** (`puzzleTasks.unit.test.ts`) — extends the verify-puzzle-solution suite to encode a real salt with `(158, 42)`, submit, and assert `coords[0][0] === [158, 42]` on the persisted record. Guards against a regression that drops the salt decode or writes `[0, 0]` — the whole point of the puzzle DM threading PR (#2873).
- **DM deny reason lands on the pow commitment** (`powTasks.unit.test.ts`) — pow's existing "should deny when decision machine returns deny" test only asserted `verified:false`; now also asserts the DM's reason string is persisted on the commitment.
- **checkForHardBlock wins over DM deny at verify** (`puzzleTasks.unit.test.ts`) — stubs `checkForHardBlock` to match, stubs the DM to also deny with a distinguishable reason, asserts the commitment carries `ACCESS_POLICY_BLOCK` and that the DM was never consulted. Locks in the ordering that the audit trail depends on.
- **Rule expiry** (`redisRulesStorage.integration.test.ts`) — inserts a rule with a 2 s TTL, waits past expiry, asserts the Redis hash is gone and the RediSearch index no longer counts it. The existing "inserts time limited rule" test only verified the TTL was set, not that expired rules stop matching.
