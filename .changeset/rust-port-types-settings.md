---
"@prosopo/types": patch
---

Add the site settings to the Rust port of the shared types: `ClientSettingsSchema` and its parts, their defaults, the settings resolvers (`resolveFrictionlessThreshold`, `resolveAllowedCaptchaTypes`, `clampImageRounds` and friends), user-agent bucketing, and `RoutingMachineOutputSchema`. Parsed settings match the TypeScript byte for byte, including which operator regex patterns Node 24 accepts. The TypeScript package is unchanged.
