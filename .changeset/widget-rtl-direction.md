---
"@prosopo/locale": patch
"@prosopo/widget-skeleton": patch
"@prosopo/procaptcha-bundle": patch
---

The widget now lays itself out right to left when its language is written right to left (Arabic today). The bundle sets `dir` on the widget from its language, and the checkbox, spinner and logo use start/end spacing so they mirror. The widget still ignores the page's own direction, so an English widget on an Arabic page stays left to right. `@prosopo/locale` gains `getLanguageDirection` for this.
