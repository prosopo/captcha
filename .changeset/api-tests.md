---
"@prosopo/api": patch
---

Add unit and type tests for the provider API client: transport behaviour (JSON error bodies vs transport errors, 400 handling, parse failures, header merging), the in-flight challenge de-duplication, every client and admin endpoint's path, body and headers, and the frictionless honeypot meta header. 128 tests, 100% statement, branch, function and line coverage. No behaviour changes.
