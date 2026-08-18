---
"@prosopo/native-ja4": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
"@prosopo/config": patch
---

Move JA4 TLS fingerprint computation to a Rust napi module (@prosopo/native-ja4). Provider-side JA4 middleware is ~2.7× faster on realistic ClientHellos. The cli bundle plugin now copies the .node binary next to the bundle so it works in the container.
