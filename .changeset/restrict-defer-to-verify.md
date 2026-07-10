---
"@prosopo/provider": patch
---

feat(provider): support `deferToVerify: true` on Restrict rules — serve the challenge, fail at verify

Extends `findHardBlockPolicy` in `captchaManager.ts` so that a Restrict rule with `deferToVerify: true` is treated as a hard-block at verify time.

Behaviour:

- **Frictionless**: the Restrict rule fires as normal — the client is served the configured `captchaType` and `solvedImagesCount` (e.g. `image` / 8 rounds). Compute burden of the challenge is imposed on the caller.
- **Verify**: `checkForHardBlock` matches the same rule and marks the commitment `Disapproved` with `ACCESS_POLICY_BLOCK`, so the dApp's `verify()` returns `{verified: false}` regardless of whether the client's solution was correct.

Motivation: PROXY_POOL_TLS_NARROW targets solving-farm-backed residential proxy pools that solve image captchas at ~100% (they use human solvers), so we can't stop them by demanding correctness — only by wasting their compute. The existing Restrict/image/8-rounds shape imposes the cost but still lets them through if they solve. Layering `deferToVerify: true` closes that loop: they burn 8 image rounds per session AND fail verify.

Test coverage updated in `captchaManager.unit.test.ts`:

- Restrict + deferToVerify → returns the policy (new behaviour).
- Restrict without deferToVerify → returns undefined (routing rule, unchanged).
- All existing Block cases (Block+deferToVerify, Block+no-captchaType, Block+captchaType-without-defer) continue to behave as before.
