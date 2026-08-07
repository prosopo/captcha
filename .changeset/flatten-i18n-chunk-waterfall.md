---
"@prosopo/procaptcha-bundle": patch
---

Collapse the i18n stack into a single chunk.

Left to split automatically it forms the longest serial chain in the widget's module graph. Measured on a staging demo load, each level costs a round trip because the browser cannot discover the next module until the previous one has parsed:

```
751 ms  translations
877 ms  i18nFrontend
919 ms  i18next
983 ms  translation.json
1029 ms captchaRenderer
1057 ms ProviderApi        <- the chunk that issues detector/assign
```

The widget needs all of it before it can render a label, so splitting buys nothing and costs four round trips. One chunk is one round trip.
