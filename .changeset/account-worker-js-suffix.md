---
"@prosopo/account": patch
---

Fix `CryptoWorkerManager` import path so downstream Vite bundles resolve
the inlined worker. The import was `./cryptoWorker.ts?worker&inline`,
which kept the `.ts` extension through TypeScript compilation; the
emitted `dist/workers/CryptoWorkerManager.js` then referenced a
non-existent `.ts` file when consumed by `procaptcha-bundle`'s Rollup
build, breaking the cypress workflow with
`Could not resolve "./cryptoWorker.ts?worker&inline"`. Aligning with
the catcher pattern (`*.js?worker&inline`).
