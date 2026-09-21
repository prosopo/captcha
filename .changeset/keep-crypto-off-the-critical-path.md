---
"@prosopo/procaptcha-bundle": patch
---

Stop a 250-byte helper from dragging 100KB of crypto onto the widget's critical path.

The bundle entry imports `at()` from `@prosopo/util` — an array accessor that throws instead of returning undefined. The bundler puts a module in the chunk of whoever imports it, and `at()` had landed in the chunk holding the web2 account code. That made the entry load that chunk, which in turn loads the shared crypto and fingerprinting chunk, before the widget could draw anything.

So the browser was fetching and parsing 100KB gzipped of signing and fingerprinting code before the checkbox appeared, none of which is needed until a visitor actually interacts.

`@prosopo/util`'s helpers are now put in the chunk the entry already loads, which breaks that link. The crypto chunks still load — they are needed to solve a captcha — but now in a second wave, after the widget is on screen, alongside the first request to the provider rather than in front of it. `solverService` is deliberately left where it is, because it carries a hashing library only the proof-of-work flow needs.

What the browser must fetch before the widget renders drops from 134KB to 34KB gzipped. Total bytes are unchanged.

Checked by loading the built bundle in a real browser: the widget renders from the first eight chunks, the crypto chunks arrive afterwards, and there are no module errors — this chunking has previously been able to produce a load-order cycle that killed the widget, so that was specifically looked for.
