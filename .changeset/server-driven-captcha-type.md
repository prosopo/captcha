---
"@prosopo/types": major
"@prosopo/procaptcha-bundle": major
"@prosopo/provider": minor
"@prosopo/keyring": patch
---

Make `captchaType` server-driven. The widget always calls
`/v1/prosopo/provider/client/captcha/frictionless`; the server returns the
type to render based on the site key's portal-side `captchaType` setting
(image / pow / puzzle short-circuit; frictionless runs the existing
decision machine).

Breaking changes:
- Removed `captchaType?: Features` from `ProcaptchaRenderOptions` (no
  client-side override). Customers using the React `render()` API with
  `captchaType: "image"` etc. should drop the prop and configure the type
  in the Prosopo portal instead.
- Removed `imageCaptcha`, `powCaptcha`, `puzzleCaptcha`, and
  `captchaComponentProvider` exports from
  `@prosopo/procaptcha-bundle/components`. Import the corresponding
  `Procaptcha`/`ProcaptchaPow`/`ProcaptchaPuzzle` components directly from
  their packages if needed. The remaining export is `BundleCaptcha`
  (renamed from `FrictionlessCaptcha` since it is now the universal mount
  for all captcha types).
- `data-captcha-type` HTML attribute is silently ignored. Customers'
  existing HTML keeps working — the server now decides.
- `imageMaxRoundsDefault` lowered from `32` to `2`. New site keys that don't
  explicitly set `imageMaxRounds` will get `2`; existing site keys keep
  their stored value until re-registered.

Trade-off: non-frictionless customers pay one extra HTTP roundtrip per
challenge (frictionless → type-specific endpoint) so that there is a
single source of truth.

Internal:
- `frictionlessTasks.sendImageCaptcha` / `sendPowCaptcha` /
  `sendPuzzleCaptcha` are now thin wrappers around a single private
  `sendCaptcha(captchaType, params)` helper, removing ~80 lines of
  duplication.
- `getDefaultSiteKeys` (in `@prosopo/keyring`) now seeds a puzzle dev site
  key alongside image/pow/frictionless, with explicit `imageMaxRounds: 2`
  and `frictionlessThreshold: 0.8` so dev seeds don't depend on schema
  defaults.
