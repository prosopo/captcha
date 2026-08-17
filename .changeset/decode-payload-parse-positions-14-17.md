---
"@prosopo/provider": patch
---

Rebuild `decodePayload.js` to actually parse payload positions 14-17 as `sw`/`md`/`bn`/`fs`.

The commit that added these signals (#3069) shipped client emission, provider glue (`frictionlessTasks` reading `decrypted.sw` etc.), and the mongoose schema — but this obfuscated bundle (built from `@prosopo/catcher`'s `bundle:provider`) was never rebuilt, so `decrypted.sw` has always been undefined on the server and mongoose omitted the fields. Evidence on prod 2026-08-17: 2347 iPhone WKWebView sessions between the earlier rollout and this fix — every one has `g` (in the current bundle) and zero have any of `sw/md/bn/fs`.

Sibling source-side fix in the private repo: `packages/catcher/src/integrity/node/getBotScore.ts` now extracts positions 14-17 with the same tri-state semantics as `g`/`chromeVerticalPx` (undefined = client predates the field, `""` = collector returned no value, `"0"`/`"1"` = actual value).
