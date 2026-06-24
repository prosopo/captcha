---
"@prosopo/procaptcha-pow": minor
"@prosopo/util": minor
"@prosopo/config": patch
---

Solve PoW captchas across a pool of web workers. The nonce space is divided and conquered across the pool (worker `i` tries nonces `i, i+N, i+2N, …`), keeping the UI responsive on higher-difficulty challenges, with a synchronous fallback when web workers are unavailable. Adds `solvePoWOffset` to `@prosopo/util` and `solvePoWParallel` to `@prosopo/procaptcha-pow`.
