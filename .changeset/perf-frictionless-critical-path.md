---
"@prosopo/account": patch
"@prosopo/load-balancer": patch
"@prosopo/procaptcha-frictionless": patch
---

Pull the frictionless POST critical path down by ~340ms on the test
hardware via four focused changes:

- **Inline Signer.** `@polkadot/extension-base/page/Signer` is now a
  static import in `ExtensionWeb2`. It's 0.5KB on disk but its dynamic
  import was costing ~190ms of network round-trip; inlining removes
  one separate chunk fetch + parse from the critical path.

- **Pre-warm the CryptoWorker.** `CryptoWorkerManager` gains a public
  `prewarm()` that actually spawns the Worker and lets its script
  parse during chunk-load time. Previously the call at module load
  only instantiated the manager class; the worker itself spun up
  lazily on the first `runTask`, putting the ~500ms worker module-eval
  inside the first `createAccount()` call. Now it overlaps with chunk
  loading and is hot by the time it's needed.

- **Prefetch providers at module load with an env-keyed cache.**
  `prefetchProviders` and `getRandomActiveProvider` share an in-flight
  `Promise<HardcodedProvider[]>` keyed by environment, so a module-load
  prefetch and the later `customDetectBot` Promise.all reuse the same
  network call. `procaptcha-frictionless` triggers the prefetch from
  module-import time using `PROSOPO_DEFAULT_ENVIRONMENT` (browser-safe
  `typeof process` guard + `EnvironmentTypesSchema.safeParse`), so the
  HTTP fetch overlaps with chunk download instead of running as part
  of the detection Promise.all.

- **Lazy-load the three captcha solvers.** `ProcaptchaFrictionless`
  no longer statically imports `Procaptcha`, `ProcaptchaPuzzle`, and
  `ProcaptchaPow`; each is `await import(...)` at the point the
  frictionless response picks a type. Two of the three wrappers used
  to be dead weight in the initial bundle; now only the chosen solver
  is downloaded, after the frictionless POST has fired. Pulls ~64KB
  of solver UI (chosen wrapper + Emotion dev runtime + builder + lazy
  shim) out of the initial captchaRenderer chunk.

Combined with the earlier worker-related changes, the frictionless POST
on the puzzle-implicit test page is now ~1290ms vs ~1630ms before this
batch, and ~6500ms in the original baseline. The remaining floor is
dominated by the BotScoreWorker's obfuscated bundle parse + run.
