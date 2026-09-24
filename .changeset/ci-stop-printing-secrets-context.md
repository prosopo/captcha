---
---

CI workflows no longer hand `toJson(secrets)` to the `print_contexts` debug action. That action echoes every input into the job log, so each run wrote the full secrets object to the log and relied solely on runner masking to hide it; masking misses short values and any transformed form of a secret, and referencing the whole context also exposed every repository secret to the step. The other contexts are still printed.
