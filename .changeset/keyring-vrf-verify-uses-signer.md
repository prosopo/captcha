---
"@prosopo/keyring": patch
---

`KeyringPair.vrfVerify` now checks the VRF output against the `signerPublic` key it is given (an address, hex public key or raw bytes). Before, it ignored that argument and always checked against the pair's own key, so it answered "did this pair sign it?" rather than "did `signerPublic` sign it?".
