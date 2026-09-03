# @prosopo/native-ja4

## 0.0.4
### Patch Changes

- 8fce190: Remove the darwin-arm64 native binaries committed by mistake in #3162, and ignore non-linux builds so a local build cannot be committed again. `napi.targets` in both packages is `x86_64-unknown-linux-gnu`; only that artefact belongs in the tree.

## 0.0.3
### Patch Changes

- 7faca4d: Add TLS timings into session doc

## 0.0.2
### Patch Changes

- 721c5ba: Move JA4 TLS fingerprint computation to a Rust napi module (@prosopo/native-ja4). Provider-side JA4 middleware is ~2.7× faster on realistic ClientHellos. The cli bundle plugin now copies the .node binary next to the bundle so it works in the container.
