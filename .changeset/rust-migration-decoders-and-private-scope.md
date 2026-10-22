---
---

Update the Rust migration plan: the detector decoders are ported in captcha-private, where their TypeScript source lives, so the open questions are now how the public provider links that private crate and which way decision machines should run. The plan also lists every captcha-private package, with the evidence for whether it is frontend or server-side, pending the owner's ruling on how far the scope rule reaches there. No npm package changes.
