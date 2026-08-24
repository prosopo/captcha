---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Context-aware validation buckets by device type, not just webview.

Context-aware validation compares a session's head SimHash against a baseline
for its context. That context was `default | webview`, which puts a phone and
a desktop in the same bucket — and those two emit genuinely different
`<head>`s, so the blended baseline matches neither well. Contexts are now the
device family crossed with the webview flag: `desktop`, `desktop-webview`,
`mobile`, `mobile-webview`, `tablet`, `tablet-webview`.

`desktop-webview` is included deliberately. Desktop webviews are a real and
notably fraudulent population here (see the Twickets desktop-webview rules),
and folding them into the plain `desktop` baseline would let exactly the
traffic we want excluded define what "normal desktop" looks like.

**Classification.** `deviceTypeFromUserAgent` in `@prosopo/types` is a
dependency-free UA classifier, deliberately not ua-parser-js: this module is
imported by the browser bundles, and the off-provider entropy sweep has to
bucket stored sessions *identically* or it writes baselines the decision
machine never looks up. One shared function keeps the two sides in lockstep.
Tablets are matched before phones because an iPad's UA carries a
`Mobile/<build>` token and an Android tablet is exactly "Android without
Mobile". Known gap, documented at the call site: an iPadOS 13+ Safari in
desktop mode identifies as a Mac and lands in `desktop` — nothing in the UA
separates it from a real Mac, and both sides make the same call, which is
what matters for the lookup.

**Back-compat.** `default` and `webview` remain valid `ContextType` members,
so settings already stored against them keep parsing. `expandContexts` maps a
legacy `default` onto the three non-webview families and a legacy `webview`
onto the three webview families, at the threshold they were saved with; an
explicit device entry always wins over the legacy entry covering it. Nothing
downstream of settings parsing branches on the legacy keys, and no data
migration is required.

**Behaviour change.** A request whose context is not configured now skips
context validation instead of borrowing another context's baseline.
Previously, configuring a single context validated *every* request against it
— with six contexts that would measure desktop traffic against a tablet
baseline and reject real users wholesale. `isContextConfigured` is the new
guard; `determineContextType` now takes the raw request UA alongside the
webview flag.

New site-key registrations default to all six device contexts.
