---
"@prosopo/procaptcha-common": patch
---

Checkbox: allow selecting the error-label text (and its inner link) so users
can copy the `Forbidden: <requestId>` reference for support tickets. The
label's `user-select: none` is a click-to-toggle hint that only makes sense
when the checkbox is enabled; on the error branch the checkbox is disabled,
so overriding to `user-select: text` (with a text cursor) is safe.
