---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-bundle": patch
---

Run the cypress suite in firefox as well as chrome whenever the PR is a release
PR.

The trusted-event checks scattered across the widget components now go through a
single `isEventTrusted()` helper in `@prosopo/procaptcha-common`. Behaviour is
unchanged: it still returns early for synthetic input, unless the bundle was
built with `PROSOPO_ALLOW_UNTRUSTED_EVENTS=1`, which only the firefox CI leg
sets. Production builds pin the define to `false`, so the branch is folded away
at build time and the allowance cannot reach a shipped bundle.

The allowance exists because cypress-real-events dispatches input over the chrome
devtools protocol, which cypress exposes for chromium browsers only — on firefox
the specs fall back to cypress' own synthetic clicks.
