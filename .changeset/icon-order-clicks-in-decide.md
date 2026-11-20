---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Decision machines now receive an icon-order solve's clicks at verify time (`iconOrderClicks`), next to the pointer trail they already got. A rule needs the clicks to tell which trail events were taps, so it can deny on tap timing instead of only escalating to another challenge.
