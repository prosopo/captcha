---
"@prosopo/procaptcha-puzzle": patch
---

Add unit and type test coverage for the puzzle widget, and fix two defects it uncovered: the checkbox click coordinates were wiped before reaching the solution salt, and a rejected challenge fetch left the spinner up with an unhandled rejection.
