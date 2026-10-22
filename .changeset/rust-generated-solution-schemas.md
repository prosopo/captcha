---
"@prosopo/types": patch
---

The schemas the widget checks its captcha solution requests with (proof of work, puzzle, audio and icon order) are now generated from the Rust definitions instead of written by hand. They accept and reject exactly what they did before, and every import path is unchanged.
