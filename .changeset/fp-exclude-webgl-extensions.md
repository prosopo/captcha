---
"@prosopo/fingerprint": patch
"@prosopo/fingerprintjs": minor
---

Drop `webGlExtensions` from the FpJS visitorId source list to remove the
1.5–2s WebGL extension/parameter walk from the account-creation critical
path. Done at the wrapper level — `@prosopo/fingerprint` now calls
`loadSources(sources, opts, ['webGlExtensions'])` directly instead of the
default `FingerprintJS.load().get()`, so the fork's source list is
unchanged. `webGlBasics` (vendor + `UNMASKED_RENDERER_WEBGL`) is kept
because that's where most of WebGL's entropy lives; the slow extension
walk is largely redundant with the basics + canvas signals already in the
hash. Existing visitorIds will rotate once on first load.

Also merges upstream FpJS v5.2.0 into the fork, picking up the new
`userAgentData` entropy source, Firefox zoom fix for font preferences,
and dep bumps.
