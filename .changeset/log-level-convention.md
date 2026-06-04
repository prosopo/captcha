---
"@prosopo/logger": patch
---

Fix log level numeric ordering to use conventional ascending severity (trace=0, fatal=5) matching Winston, Pino, and Log4j. Also fixes the emitted level field which was recording the threshold instead of the message level.
