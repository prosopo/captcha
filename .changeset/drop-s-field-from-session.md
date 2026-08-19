---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

fix(provider,types,types-database): drop the `s` field from `Session`,
`DetectorResult`, and the mongoose `SessionRecordSchema`. The client
no longer emits it, so the server-side wiring is redundant.

Stop reading position 18 out of the decrypted client payload in
`getBotScore`. Prune every `s`/`ss`/`sv` local, log field, and
`createSession` argument in `frictionlessTasks.ts`, the origin-fallback
merger in `captchaManager.ts`, the frictionless handler, and
`submitPoWCaptchaSolution.ts`. Two `s`-focused unit tests removed.

Backward-compatible: older clients still send position 18, the new
server just ignores it. Existing Mongo docs keep their `s` values;
mongoose stops projecting or writing the field. No migration needed.
