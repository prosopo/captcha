---
"@prosopo/procaptcha-react": patch
---

Add unit and type tests for the React image-captcha widget: the button, modal
portal, captcha grid and round component, the event collector, the lazy
boundary, and the widget itself (visible and invisible modes, honeypot,
autoStart, session invalidation, the procaptcha:execute event, language
handling and the checkbox flow). 174 tests, 98%+ statement, line and function
coverage.

Changes found while writing them:

- A failed `manager.start()` from a checkbox click left the loading spinner up
  permanently, with no way back to the checkbox, and produced an unhandled
  rejection.
- `CaptchaComponent` wrapped an out-of-range round index, silently rendering a
  different round's images; it now rejects the index.
- Removed unreachable branches in `CaptchaWidget` and `ProcaptchaWidget` that
  read touch coordinates off a React synthetic click, which never carries them.
  This also removed the package's `any` and `@ts-ignore` uses: the image retry
  counter now lives in a data attribute rather than an untyped property.
