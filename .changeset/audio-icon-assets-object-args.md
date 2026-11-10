---
"@prosopo/audio-assets": patch
"@prosopo/icon-order-assets": patch
"@prosopo/provider": patch
---

`renderAudioChallenge` and `renderIconOrder` take one optional object (`{ settings, sampleRate }` and `{ geometry, settings, seed }`) instead of several optional positional arguments.
