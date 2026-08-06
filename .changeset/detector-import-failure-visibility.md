---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
---

Report why the detector was unavailable instead of swallowing it.

`customDetectBot` wraps provider selection, the assign request and the blob-URL
import in one `try`, and the `catch` was empty. Falling back is correct — there
is no bundled detector, so a failure here means the frictionless POST goes out
with an empty token and the provider decides what to serve. But the reasons are
not equal: a slow network is routine, whereas a pool bundle that throws on
import degrades **every** session on that provider to an image captcha, with
nothing in the client console or the provider logs to say why.

That is not hypothetical. A detector pool built at catcher 3.1.48 emitted
bundles that died on evaluation with `Class constructor D cannot be invoked
without 'new'` — an obfuscator seed collision that renamed a class over a live
binding. Every staging session silently fell back to an image captcha, and the
only way to find it was to reproduce the blob import by hand in a browser: the
provider logged a healthy `bundle pool loaded count=20` and served the bundles
happily, because from its side nothing had failed.

The catch stays broad and the fallback is unchanged; it now `console.error`s
what it caught, matching how the sibling `procaptcha-common` modules report.
