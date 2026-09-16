---
"@prosopo/procaptcha-common": patch
"@prosopo/types": patch
---

Look up user callbacks on `window` without `any`, so each callback is type-checked against the arguments it is actually called with. Only a leading `window.` is now stripped from a callback name. The `error-callback` render option type now accepts the `Error` it is called with.
