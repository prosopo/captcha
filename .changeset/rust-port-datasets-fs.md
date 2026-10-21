---
"@prosopo/datasets-fs": patch
"@prosopo/logger": patch
---

Add a Rust port of the datasets-fs CLI, `prosopo-datasets-fs`: flatten, resize, labels, relocate, get and both captcha generators. The resize calls the libvips that sharp bundles, in sharp's own steps, so it writes the same image bytes, and the generated captcha files match the TypeScript's for the same seed. The Rust logger now exports its `JSON.stringify` port for this. The TypeScript is unchanged.
