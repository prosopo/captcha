---
"@prosopo/types": patch
---

Make the `ipDetectorRiskWeight` site setting optional instead of filling in 0 when it is parsed.

With a parse default the field became required on the parsed settings type, so every caller that builds a full settings object had to set it. The portal doesn't, which broke the captcha-private release build for v3.10.0. The provider already reads a missing weight as 0, so behaviour is unchanged.
