---
"@prosopo/procaptcha-icon-order": minor
"@prosopo/procaptcha-frictionless": patch
"@prosopo/locale": patch
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
"@prosopo/client-bundle-example": patch
---

Bring icon-order in line with main.

The icon-order widget is rebuilt in plain TypeScript and DOM, like every other widget since React was removed, and the frictionless wrapper mounts it. Its button and prompt text now come from the translation files, in every supported language.

Verifying an icon-order token is now single-use under concurrent requests, the same as puzzle: the record is claimed as checked in one conditional write, so only one of several simultaneous verifies can pass. Icon-order submissions also pick up main's shared payload decoding and scroll-event collection.

The demo playground gains icon-order pages.
