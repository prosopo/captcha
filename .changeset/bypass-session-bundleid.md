---
"@prosopo/provider": patch
---

fix(provider): promote bundleId onto bypass-path sessions so SIMD / BDP attach can decrypt

Sitekeys configured with a fixed `captchaType` (`pow` / `image` / `puzzle`) short-circuit
the frictionless bot-detection path via `runConfiguredCaptchaTypeShortCircuit` and build
their session via `buildBypassSessionParams`. Before this fix, that helper never wrote a
`bundleId` onto the session, so every subsequent `decryptAndAttachSimdReadingsIfAbsent`
call at `/captcha/{type}` and solution-submit resolved `bundle=undefined` and silently
dropped the ciphertext — SIMD readings and behavioural data never landed on the session
or the powcaptcha record for these sitekeys.

The fix resolves the widget's `detectorSessionId` → `bundleId` via the existing Redis
binding and promotes it onto the bypass session so the attach path finds the correct
keypair. Empty-pool PoW fallback continues to no-op (no detector was assigned).
