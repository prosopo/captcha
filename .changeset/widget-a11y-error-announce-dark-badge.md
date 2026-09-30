---
"@prosopo/locale": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-frictionless": patch
---

Widget accessibility fixes.

- Screen readers now announce the checkbox's error message, through a polite live region that exists from the moment the widget mounts.
- The authenticated ("Verified agent" / "Trusted request") badge now follows `theme: "dark"` and the widget's language.
- The badge no longer carries a fixed `aria-label`, which hid its visible text and said "Verified agent" even for a trusted request.
