---
"@prosopo/native-ja4": patch
---

A malformed TLS ClientHello no longer kills the provider process. The JA4 parser indexes extension bytes without checking they exist, and a panic inside the native module aborted Node outright. The binding now catches the panic and throws an ordinary error, which the provider already turns into the default JA4 fingerprint. Fingerprints for well-formed hellos are unchanged.
