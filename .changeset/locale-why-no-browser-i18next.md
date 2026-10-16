---
"@prosopo/locale": patch
---

Document why the widget keeps its own small translation look-up instead of i18next: measured again, i18next core is 14.1 KB gzipped against 1.8 KB, on a render path of about 21 KB, for plural and context features the widget does not use.
