---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-bundle": patch
---

Challenge popups now use the same text direction as the widget that opened them, so an Arabic or Hebrew widget gets a right-to-left popup. When a later widget on the page changes the shared language, earlier widgets now update their direction too instead of keeping the old one.
