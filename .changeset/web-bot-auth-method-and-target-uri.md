---
"@prosopo/web-bot-auth": patch
"@prosopo/provider": patch
---

Accept the Web Bot Auth signatures that ChatGPT and Google's agents actually send. ChatGPT signs `@method` as well as `@authority`, and Google signs `@target-uri`, `@method` and one member of its `Signature-Agent` dictionary (`"signature-agent";key="g"`). The verifier only knew `@authority` and the whole `signature-agent` header, so every request from both was rejected as `bad-signature` — about 1,300 in the week to 2026-10-27 — and went through the ordinary captcha instead of the site's agent rules.

The verifier now handles `@method`, `@target-uri`, `@path` and the `key` parameter. A signature covering anything else is rejected as `unsupported-component` rather than `bad-signature`, so the log says which it was.
