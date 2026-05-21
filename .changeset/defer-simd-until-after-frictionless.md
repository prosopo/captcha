---
"@prosopo/procaptcha-frictionless": patch
---

Defer the SIMD benchmark trigger to after the frictionless POST is in
flight, and stop attaching SIMD readings to the frictionless request
body. The previous `await detectionResult.getSimdReadings(0)` still
waited a microtask cycle and the full RSA-OAEP + AES-GCM encryption
(10–30ms) even when `timeoutMs` was `0`, and the benchmark itself —
a CPU-bound WASM loop — was running concurrently with the BotScore
worker, contending for cores on small VMs. Stretches like 344ms →
1167ms on staging were attributable to the contention.

The first-hop-wins semantics on the provider mean we just lose the
frictionless-hop attach, not the signal — readings still attach on the
captcha challenge GET and on solution submit.
