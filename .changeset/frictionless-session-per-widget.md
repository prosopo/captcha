---
"@prosopo/types": patch
"@prosopo/api": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/provider": patch
---

Pages with more than one widget no longer make every widget after the first fail with `No session found`. The provider hands the same live session to every /frictionless call from one user, IP and site key, and the first challenge used it up, so each later widget got a 400 and had to fetch a new session; clicking several at once could run a widget out of retries and reset it. Each widget now sends a slot number (0, 1, 2, … in page order, capped at 15) and the provider keeps one session per slot. The first widget keeps the old dedup key, so single-widget pages are unchanged, and a reload still reuses each widget's own session.
