---
"@prosopo/provider": patch
---

Replace `read-tls-client-hello` with a spec-compliant JA4 implementation.

Drops the external dependency and adds `packages/provider/src/api/ja4.ts`, a
self-contained JA4 parser that matches the Rust/AWS-Lambda reference:

- TLS 1.3 detection: parses the `supported_versions` extension body to pick
  the highest non-GREASE version, instead of assuming `"13"` on extension presence
- Single-byte ALPN: uses `"0"` for the missing last position (e.g. `"h"` → `"h0"`)
- Non-alphanumeric ALPN bytes: rendered as 2-char lowercase hex (e.g. `"/"` → `"2f"`)
- Validates that cipher-suite length is even; throws `Ja4ParseError` if not
- Parses `Buffer` directly — no `Readable` stream wrapping required
