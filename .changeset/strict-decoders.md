---
"@prosopo/util": minor
"@prosopo/provider": patch
---

Add decodeBase64, decodeBase64Url and decodeHex, which reject corrupt input instead of decoding it to the wrong bytes. The provider now uses them for the TLS ClientHello header, JWT payloads and open detector tokens.
