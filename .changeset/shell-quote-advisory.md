---
---

Bump the transitive `shell-quote` from 1.10.0 to 1.11.0 in the lockfile, which fixes critical advisory GHSA-pqg4-j6r4-53mv. The security-scan audit fails on every pull request until this lands. Only build tooling uses it (`concurrently`, `npm-run-all`), so nothing that ships changes.
