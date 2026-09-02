---
"@prosopo/native-ja4": patch
"@prosopo/native-merkle": patch
---

Remove the darwin-arm64 native binaries committed by mistake in #3162, and ignore non-linux builds so a local build cannot be committed again. `napi.targets` in both packages is `x86_64-unknown-linux-gnu`; only that artefact belongs in the tree.
