---
"@prosopo/native-ja4": patch
"@prosopo/native-merkle": patch
"@prosopo/native-puzzle": patch
---

Adds property-based (fuzz) tests to the three native Rust packages, which found three bugs, now fixed:

- native-ja4: a malformed TLS ClientHello (smallest case: an ALPN extension claiming a 1-byte
  protocol with no byte after it) made the ja4 library panic, and a panic inside a native call kills
  the whole Node process. The panic is now caught and reported as a normal "bad input" error. The
  library itself is fixed in Protect and needs publishing as a new prosopo-ja4 version.
- native-merkle: solution strings were sorted by their UTF-8 bytes, but the JavaScript version sorts
  by UTF-16 units, so a solution mixing emoji with characters like U+FFFC hashed differently in Rust
  and JS. It now sorts the way JS does.
- native-puzzle: the port of JS `Math.round` added 0.5 then floored, which rounds wrongly for
  0.49999999999999994 and odd whole numbers above 2^52. It now matches `Math.round`.
