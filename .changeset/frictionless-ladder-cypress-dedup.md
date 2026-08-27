---
"@prosopo/cypress-shared": patch
---

Drop the warm-up visit from the score ladder spec.

`/frictionless` deduplicates on user + IP + sitekey and replays a live session instead of scoring again, and the widget's identity is fingerprint-derived, so it is the same for every test in the run. The `beforeEach` warm-up visit mounted the widget, which created a score-0 session — and the request the test had just set its language header on got that session replayed back. Every banded case returned `pow`.
