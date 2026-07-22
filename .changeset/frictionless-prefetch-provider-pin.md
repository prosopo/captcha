---
"@prosopo/procaptcha-frictionless": patch
---

perf(frictionless): fire provider-pin `/healthz` in parallel with `detect()` instead of serial after

`customDetectBot` was resolving the provider pin (`getProcaptchaRandomActiveProvider`, which hits `/healthz` on the load-balancer DNS endpoint) only after `detect()` returned — so the healthz round-trip was fully serial with the detector suite's ~seconds of worker + fingerprint work. On the network waterfall this showed up as `index-*.js → blob → blob → healthz → frictionless`, with `healthz` blocking the `frictionless` POST from firing.

Fire the pin resolution fire-and-forget at the very top of `customDetectBot`, before the `ExtensionLoader` / `DetectorLoader` dynamic imports even start. `getProcaptchaRandomActiveProvider` is memoised via `pinPromiseCache` keyed on `(env, ipMode)`, so:

- catcher's internal `randomProviderSelectorFn` (called during `detect()`) hits the in-flight promise instead of firing its own healthz
- the awaited `getProcaptchaRandomActiveProvider(...)` after `detect()` reuses the resolved promise

Both cache keys are prewarmed — one for catcher's selector (no `ipMode`) and one matching the dapp's `data-ipv4`/`data-ipv6` if set. Same-key when the dapp is dual-stack (the common case), which is one healthz request total instead of two.

Net effect: the healthz round-trip (~100–200 ms on cold DNS/TLS) now overlaps with detector work instead of following it. The `frictionless` POST becomes the next hop on the wire immediately after the workers post their scores back.
