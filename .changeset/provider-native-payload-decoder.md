---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

The provider now decodes sealed detector payloads with
`@prosopo/native-bundle-payload`, a compiled Rust module published to npm. It
is the same code Prosopo's own servers use to read these payloads, and the
provider has stopped carrying its own TypeScript copy. It accepts and rejects
exactly the payloads the old decoder did, and a payload it cannot read still
counts as "decryption failed".

- `decodePayload.js` has been regenerated. It is about half its old size, and a
  full decode takes about 1.2 ms instead of 3.8 ms.
- `@prosopo/provider` depends on `@prosopo/native-bundle-payload` 0.1.0, a
  prebuilt linux-x64 binary, so you don't need Rust to install it.
- The CLI bundle copies the binary beside `decodePayload.js`, as it already
  does for the other native modules, so the Docker image needs no
  `node_modules`. `@prosopo/native-*` packages are now hoisted so the CLI build
  can find them.
- Open-format payloads (`open-v1`) are unchanged.
