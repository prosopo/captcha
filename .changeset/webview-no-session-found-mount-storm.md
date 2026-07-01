---
"@prosopo/api": patch
"@prosopo/procaptcha-frictionless": patch
---

fix(api,procaptcha-frictionless): collapse the WKWebView "No session found" mount storm. Two independent client-side amplifiers were stacking to produce a cascade of `CAPTCHA.NO_SESSION_FOUND` errors during the frictionless → PoW hand-off in iPhone WKWebView.

- `ProcaptchaFrictionless`'s outer `useEffect` depended on `[config, callbacks, detectBot, config.language]`. Host pages that recreate the `callbacks` object on every render (the common React pattern) refired the effect on each parent re-render and triggered a fresh `/frictionless` call each time. Deps are now the primitive widget identity (`config.account?.address`, `config.language`, `config.mode`) plus a `startedForKeyRef` guard, so React StrictMode double-invocation and same-identity re-renders are idempotent. `callbacks` and `detectBot` are still read live via the closure captured by `start()`.
- `ProviderApi` had no in-flight guard on the three challenge-fetch calls, so a WKWebView duplicate POST (microseconds-apart) would race for the atomic `checkAndRemoveSession` on the same sessionId; the loser saw `NO_SESSION_FOUND`. A per-`(path, sessionId)` in-flight dedupe now attaches duplicate calls to the same Promise. Entry drops on settle, so a genuine retry after a real network error still fires a fresh POST; skipped when there's no sessionId to race on.
