---
"@prosopo/procaptcha-bundle": patch
---

Loading the Procaptcha script after the page has finished loading (from a tag manager, or an app that adds the script on demand) no longer renders every widget twice or calls the `onload` callback twice. The first copy of each widget used to be left running in the background, doubling the requests it made.

Loading the script a second time on the same page no longer renders the existing widgets again: the second copy only renders `procaptcha` elements that don't have a widget yet, and `window.procaptcha` stays pointed at the first copy so `reset()` and `remove()` still reach those widgets.

Widgets also now render when the script is served under a different filename, which used to leave the page with no widget if the script ran before the page finished loading.
