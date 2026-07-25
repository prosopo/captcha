---
"@prosopo/user-access-policy": patch
"@prosopo/common": patch
"@prosopo/provider": patch
---

fix(user-access-policy,common,provider): quiet two high-volume log spammers

- `user-access-policy`: switch the split-query sub-probes from `FT.AGGREGATE + LOAD @__key` to `FT.SEARCH NOCONTENT`. The aggregate reply path in `@redis/client` 5.x can throw on a null result row and the sub-query then silently returns `[]`; the NOCONTENT reply shape doesn't have that failure mode. Removes ~2k error logs per hour without changing lookup semantics.
- `common`: `ProsopoBaseError` auto-logs now carry a `msg` field (mirroring the translation key). Previously every auto-logged error landed in the "undefined msg" bucket in log dashboards (~800/hour).
- `provider`: add the missing `msg` on the image-verify catch that emits the same pattern.
