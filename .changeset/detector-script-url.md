---
"@prosopo/types": patch
"@prosopo/provider": patch
"@prosopo/api": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/cli": patch
---

Experimental: load the detector from an https URL on the provider with a `<script type="module">` tag instead of importing an inline copy from a `blob:` or `data:` URL.

The widget now asks the assign call for URL delivery. A provider that supports it returns a path to `GET /v1/prosopo/provider/client/detector/script` instead of the script, and the widget injects a module script for it. A site's CSP then only needs the provider origin in `script-src`, rather than `blob:` or `data:`, and there is no dynamic `import()` left for bundlers to rewrite. The provider only serves a session's script to an address that maps to the same bundle, so a session id handed to someone else cannot be used to collect more bundles than each address already gets.

If the script fails to load, the widget asks for an inline copy and imports it the old way. Older widgets never ask for URL delivery, and older providers ignore the request, so either side can be released first.

The frictionless request now carries `detectorLoadFailure` when loading went wrong: a failed assign, a CSP block, a network error, a script that loaded without registering itself, or a failed inline import. The provider logs it and counts it in `detector_load_failures_total`, split by whether a fallback still produced a token. Before this, a failure left nothing but a `console.error` in the browser.
