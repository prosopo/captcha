---
"@prosopo/procaptcha-pow": patch
---

Add unit and type tests for the PoW widget and Manager, and fix the defects they exposed:

- a retried solve restarted at coordinates (0, 0), losing the real click telemetry an escalated widget depends on
- three paths in `ProcaptchaWidget` (checkbox change, autoStart effect, `procaptcha:execute` handler) let a rejected `manager.start()` escape as an unhandled rejection, leaving the spinner running
