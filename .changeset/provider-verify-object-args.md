---
"@prosopo/provider": patch
---

The provider's captcha verify methods (PoW, puzzle, icon order, audio and the server-side verify calls) now take one named-argument object instead of a long list of positional, mostly optional arguments. Unused `headers` arguments are gone. HTTP requests and responses are unchanged.
