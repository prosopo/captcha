---
"@prosopo/locale": patch
"@prosopo/procaptcha-react": patch
---

The colon after the "Select all …" prompt is added by the widget again, rather than being part of each translation. Every language's `WIDGET.SELECT_ALL` no longer ends with a colon, and the widget renders it as `<prompt>: <target>`. A locale test now fails if a translation brings its own colon back.
