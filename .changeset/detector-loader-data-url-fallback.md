---
"@prosopo/procaptcha-frictionless": patch
---

Fall back to a `data:` URL when `blob:` is blocked, so a CSP that permits one scheme keeps the detector.

`DetectorLoaderFromScript` imported the provider-served module text from a blob URL only. `blob:` and `data:` are gated by different CSP directives and sites commonly allow one without the other — a `script-src` of `*` matches neither, and a policy listing `data:` for scripts with `blob:` only under `worker-src` blocks the blob path outright. On such an origin the import threw, the caller fell through to its no-detector path, and the session sent no detector session id, no token and no head hash, so the provider recorded `MISSING_TOKEN` and served a challenge the session could not pass frictionlessly.

- Percent-encoding rather than base64: the module is several hundred KB and `btoa(String.fromCharCode(...bytes))` overflows the call stack at that size.
- The blob URL is revoked on every path, including when its own import fails.
- `/* webpackIgnore: true */` sits alongside `/* @vite-ignore */`. Neither is redundant — `@vite-ignore` stops Vite analysing a non-literal specifier, `webpackIgnore` stops webpack rewriting it into a context module that cannot resolve a blob or data URL at runtime.
- The import is injected as `ModuleImporter` so the fallback is testable without a real dynamic import.

Known gap, not addressed here: `removeComments` in the shared build config strips both pragmas from `dist/`, so consumers bundling this package from npm still receive a bare `import(url)`. Emitting comments would leak source comments into shipped output, so that needs a mechanism which does not rely on a comment surviving compilation.
