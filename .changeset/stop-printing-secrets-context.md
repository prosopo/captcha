---
---

CI jobs no longer hand every repository secret to the print_contexts step. That step echoed the secrets as JSON into the job log, where GitHub's masking only catches a secret's exact text, so any secret containing a quote or backslash appeared escaped and unmasked.
