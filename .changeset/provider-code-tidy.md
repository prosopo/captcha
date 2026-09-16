---
"@prosopo/provider": patch
---

Tidy up comments and small pieces of duplicated code across the provider package.

Comments that repeated the code, or told the story of past changes rather than
describing what the code does now, are removed or rewritten. Explanations that
were copied into several places now live in one. A handful of comments that no
longer matched the code are corrected.

Repeated blocks inside a single file are folded into small local helpers (for
example the six rejection writes in puzzle verification), and unused locals,
imports and one unused private function are removed.

No behavioural change is intended: exports, responses, status codes, error keys
and log messages are unchanged.
