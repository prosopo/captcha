---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Add a diagnostic admin endpoint `AdminApiPaths.GetSession` that returns
a session's current Mongo + Redis views verbatim, plus a cypress
consistency suite that walks a session through frictionless → pow →
pow-submit and asserts the two stores agree on `captchaType`,
`bundleId`, and `deleted` at each stage. Backs a class of prod bugs
where the two stores drifted (dedup evicting mid-flow, escalations not
propagating to Redis, etc.) surfacing as `INCORRECT_CAPTCHA_TYPE` 400s
on the client rather than as store-consistency errors.

Also adds a frontend-error-path unit test covering the case where the
client sends a `detectorSessionId` whose bundleId is no longer in the
in-memory pool (rotation / TTL). Asserts the handler does NOT evict
and does NOT rebind — reuse response served with the cached sessionId
unchanged; any downstream OAEP failure surfaces cleanly via the DM's
empty-BDP path.
