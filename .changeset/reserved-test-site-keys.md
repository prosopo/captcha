---
"@prosopo/types": patch
"@prosopo/provider": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-frictionless": patch
---

feat(provider,widget): reserved always-pass / always-fail test site keys

Add two fixed, well-known reserved site keys (`ALWAYS_PASS_SITE_KEY` /
`ALWAYS_FAIL_SITE_KEY`) that force a deterministic captcha verdict for CI/CD and
integration testing, constant across production, staging and development.

- `@prosopo/types`: shared constants + `getTestSiteKeyMode`, imported by both the
  provider and the widget.
- `@prosopo/provider`: short-circuits the `submit*` and `verify` endpoints (verify
  runs before the signature check, so no dapp secret is needed), serves an
  invisible PoW session from the frictionless handler, and bypasses domain
  middleware. Works in every environment with no DB record.
- `@prosopo/procaptcha-common` / `-react` / `-frictionless`: render a prominent
  `TestModeBanner` warning (always pass/fail) plus a console warning so a test key
  can never ship to production unnoticed.

always-pass verifies at both the submit and verify layers; always-fail fails at
both. Safe in production by design: the override only weakens protection for a
dapp that deliberately opts in, mirroring reCAPTCHA's public test keys.
