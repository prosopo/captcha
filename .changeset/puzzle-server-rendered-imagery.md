---
"@prosopo/puzzle-assets": patch
"@prosopo/provider": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/types": patch
---

Render puzzle captcha imagery on the provider instead of sending the answer to the client.

The challenge used to carry `targetX`/`targetY` and the widget drew the target box straight from them, so any HTTP client could echo the coordinates back as its solution and pass without a browser. The provider now synthesises a background procedurally, cuts the notch into the pixels, and returns the background and piece as data URIs; the target and the tolerance never leave the server.

Backgrounds come from the new `@prosopo/puzzle-assets` package and are single-use — reusing one across two challenges would let an attacker diff the composites and recover both notch positions.
