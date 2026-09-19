---
"@prosopo/provider": patch
---

Regenerate the payload decoder, which was running about nine times slower than the one it replaced.

The decoder ships as a pre-built obfuscated file. The obfuscator reshapes it with a fresh random seed on every build, and how fast the result runs varies a lot between seeds — measured across eight builds of identical source, the spread was more than 3x, and the build that shipped in 3.8.14 was at the slow end of it.

It decodes a payload on the request path and does so synchronously, so the cost did not stay on the requests doing the decoding: it held the event loop long enough to push up the response time of everything else being served at the same time, health checks included.

The replacement measures about nine times faster than the one it replaces and slightly faster than the 3.8.13 build, on the same input on the same machine. It was picked by benchmarking several builds and keeping the fastest, and checked against a payload round trip first so the speed is not bought with a decoder that reads the format wrongly.
