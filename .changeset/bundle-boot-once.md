---
"@prosopo/procaptcha-bundle": patch
---

Loading the Procaptcha script after the page has finished loading (from a tag manager, or an app that adds the script on demand) no longer renders every widget twice or calls the `onload` callback twice. The first copy of each widget used to be left running in the background, doubling the requests it made.
