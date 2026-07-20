---
"@prosopo/account": patch
"@prosopo/procaptcha-frictionless": patch
---

perf(account,procaptcha-frictionless): move sr25519 keypair derivation into CryptoWorker + trim critical-path round-trips

Reduces the frictionless client-side gap (last widget-bundle chunk → `POST /v1/prosopo/provider/client/captcha/frictionless`) by ~1s on constrained hardware (measured at 30x CPU throttle, mean over 5 samples: **3431ms → 2434ms, −997ms / −29%**).

Three changes in one PR because they interact:

1. **sr25519 keypair derivation moves off the main thread.** `ExtensionWeb2.createAccount` was calling `keyring.addFromMnemonic(mnemonic)` synchronously on the main thread. Internally that's `mnemonicToMiniSecret` → `sr25519FromSeed` → a scalar multiplication on Ristretto25519 via `@noble/curves`, dominated by `wNAFCached` / `getPrecomputes` / `multiply`. On a mid-tier laptop that's ~500ms of blocking main-thread work sitting inside the giant `HandlePostMessage → RunMicrotasks` task that also runs the DOM-bound detectors. CryptoWorker now does the derivation and returns the raw `{publicKey, secretKey}` bytes; main thread wraps them with `keyring.addFromPair(...)` which is cheap byte-packaging — no ECC work.

2. **`entropyToMnemonic` + keypair derivation fused into a single worker task (`entropyToKeypair`).** Previously two sequential worker round-trips would have been needed (entropy → mnemonic on worker → return → mnemonic → keypair on worker → return). Fusing saves one postMessage transit (~30-80ms under throttle) on the critical path. The existing `entropyToMnemonic` task stays for callers that still want the mnemonic string standalone.

3. **`CryptoWorkerManager.testWorker()` removed.** It was a Blob-URL-era defensive check — post-construction failures already surface via `worker.onerror` (which cleans up so the next `runTask` reinitialises), and task-level failures surface via `runTask`'s 10s timeout + reject (which triggers the main-thread fallback). Under Vite's `?worker&inline` constructor the round-trip is pure overhead. Removing it saves ~30-80ms per worker init on constrained hardware.

Also: `customDetectBot` starts `ext.getAccount(config)` before calling `detect()` so the CryptoWorker task overlaps with the detector's module.evaluate + botScore work instead of gating them at the end.

Fallback path is preserved end-to-end: worker construction failure or task timeout falls back to synchronous main-thread derivation via `entropyToMnemonic` + `keyring.addFromMnemonic`, matching prior behaviour for browsers that block workers (CSP, embedded WebViews).

Measurement setup: Chrome via CDP, 30x CPU throttling, 5 samples each on identical hardware, gap timed from last js chunk `finish` → `healthz` request start (proxy for “widget can send frictionless POST”). Both sides use the same generation of the catcher-derived detector blob, so the delta reflects only the captcha-side changes.
