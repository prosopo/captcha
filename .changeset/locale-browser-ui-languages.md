---
"@prosopo/locale": patch
---

Add `BROWSER_UI_LANGUAGES`, the list of every language Chrome and Firefox ship their interface in, with each one's layout direction. A test checks each direction against `getLanguageDirection`, so a browser language the right-to-left lists miss fails CI.
