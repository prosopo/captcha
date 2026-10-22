---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

The Rust provider now takes detector pool pushes on the admin route, reading an authenticated push with the same 128 MB limit as the TypeScript and saving the pool to disk, so every admin route is now served by the Rust provider. The TypeScript is unchanged.
