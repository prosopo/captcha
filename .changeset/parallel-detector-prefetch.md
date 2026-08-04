---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
---

Start the detector-bundle assignment at page load instead of after the widget mounts.

Since the detector moved into the provider-served pool, the frictionless flow cannot begin until `/detector/assign` returns. That request was issued by `customDetectBot`, which only runs once React has mounted the widget — so it queued behind the bundle's dynamic-import chain. Measured on the staging demo, `assign` did not leave the browser until **1513 ms**, of which ~700 ms was purely waiting for chunks to arrive in sequence.

Nothing in that request depends on React, i18n or the widget config: it needs the site key (a DOM attribute), the environment (a build-time constant) and the IP-mode flags (DOM attributes). The bundle entry now kicks it off as soon as it has read those, and `customDetectBot` claims the in-flight promise instead of starting its own.

The prefetch is loaded by dynamic import so the provider selector and API client do not land in the entry chunk and delay first paint; the entry grows by ~400 bytes. It is fire-and-forget — a failed prefetch is indistinguishable from no prefetch, and the existing fallback path still resolves a provider itself.

The cache is single-use and keyed on `(environment, ipMode, siteKey)`, so a retry — which is retrying precisely because the pinned pronode failed — re-resolves rather than reusing a stale pin, and a second widget with different flags cannot claim another's assignment.
