---
"@prosopo/procaptcha-pow": minor
"@prosopo/util": minor
"@prosopo/config": patch
---

Solve PoW captchas across a pool of web workers. The nonce space is divided and conquered across the pool (worker `i` tries nonces `i, i+N, i+2N, …`), keeping the UI responsive on higher-difficulty challenges, with a synchronous fallback when web workers are unavailable. The pool defaults to 4 workers (`PROSOPO_POW_WORKERS`) and never uses more than one fewer than the device's cores, so the page keeps a core free. Adds the `solvePoWOffset` helper to `@prosopo/util`; `@prosopo/procaptcha-pow` now solves PoW challenges on a worker pool internally.
