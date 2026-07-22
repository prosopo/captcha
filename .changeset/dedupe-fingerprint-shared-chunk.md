---
"@prosopo/procaptcha-bundle": patch
---

perf(procaptcha-bundle): force `@prosopo/fingerprint` + `@prosopo/fingerprintjs` into a single shared chunk (~220ms main-thread win)

Chrome timeline traces on a heavy page (pimeyes.com) showed **two nearly-identical ~220ms main-thread tasks** dominated by `getContext` / `getParameter` / `getImageData` — Canvas + WebGL fingerprint sources running twice per widget session. Different obfuscated function graphs in each task (`vr → jl → mr` vs `ge → kn → U`) and different chunk URLs (`index-Bty406ZI.js` vs `index-Cewgc2Jv.js`), while `@prosopo/fingerprint/index.ts` deliberately memoises via a module-local `componentsCache` — proof that Vite was inlining `@prosopo/fingerprint` into multiple downstream chunks (the widget bundle for `account.createAccount` → `getFingerprint`, and `procaptcha-pow` for `Manager` → `getFingerprintProof`), giving each chunk its own module instance and its own private cache.

`manualChunks` now routes `packages/fingerprint/dist` + `packages/fingerprintjs/dist` into one shared chunk (per-build opaque name, same pattern as `honeypotChunkName` — no `fingerprint` in the emitted URL). One physical chunk = one module instance = one populated `componentsCache` = one execution of the expensive Canvas + WebGL sources per widget session. Both `getFingerprint` and `getFingerprintProof` now hit the cache on the second call within a session, which was the original design intent.

Measured on staging widget injected into pimeyes.com:

- Before: 2 × ~220ms main-thread long tasks, ~2000 `getContext` self-samples on main
- After: 0 `getContext` self-samples on main, fingerprint dropped out of the main-thread long-task list entirely

No API change. Opaque chunk name means the emitted URL doesn't leak what's inside (won't help static URL-blocklist scrapers).
