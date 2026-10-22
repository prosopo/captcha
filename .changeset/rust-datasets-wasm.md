---
"@prosopo/datasets": patch
"@prosopo/util": patch
---

Add `@prosopo/datasets-wasm`: the image captcha commitment id (the merkle root over the solution hashes) compiled from the provider's Rust to WebAssembly, so the widget and the Rust provider can compute it with one implementation. A test runs it side by side with the TypeScript on the same solutions and gets the same ids. Nothing uses it yet; procaptcha keeps the TypeScript until the TypeScript provider is retired. The Rust datasets and util crates gain features that leave out their network and file code, which WebAssembly cannot build.
