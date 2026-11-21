---
---

The local git hooks now refuse pushes to main, staging and dev as well as commits on them (BRANCH_PROTECTION_DISABLED=true still overrides), and run without an interactive bash, so they no longer load your shell profile.
