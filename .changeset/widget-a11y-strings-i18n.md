---
"@prosopo/locale": patch
"@prosopo/widget-skeleton": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-react": patch
---

The widget's loading spinner and the reload icon no longer announce hard-coded English. The spinner is a progress indicator labelled from the new `WIDGET.LOADING` string (in all 32 languages) once translations are loaded, and the reload icon's tooltip uses the same translated label as the button.
