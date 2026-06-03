---
"@prosopo/provider": patch
---

Document three known spec deviations in `read-tls-client-hello`'s JA4 implementation.

Adds inline comments to `ja4Middleware.ts` explaining how `calculateJa4FromHelloData`
differs from the Rust/AWS-Lambda reference: TLS 1.3 detection via extension presence
rather than content, single-byte ALPN first-char duplication, and ASCII decoding of
non-alphanumeric ALPN bytes instead of hex encoding.
