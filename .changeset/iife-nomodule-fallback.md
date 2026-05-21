---
"@prosopo/procaptcha-bundle": minor
"@prosopo/widget-skeleton": patch
---

Emit a classic-script IIFE build of the procaptcha bundle
(`procaptcha.bundle.iife.js`, ~1.5 MB / 634 KB gzipped) alongside the
existing ES-module bundle, so customer integrations can pair
`<script type="module">` with `<script nomodule>`. Crawlers and runtimes
that do not execute module scripts (notably Ahrefs' renderer) currently
skip the bundle entirely and never see the rendered widget link;
shipping a `nomodule` fallback restores backlink discoverability.

Runtime bundle-name lookup now takes a list of candidate filenames so
each variant finds its own `<script>` tag in the DOM. The IIFE config
disables `manualChunks`, sets `inlineDynamicImports: true`, and uses
`emptyOutDir: false` to co-exist with the ESM build in `dist/bundle/`.

Widget logo anchor hygiene: drop the `#widget` URL fragment, the
visually-hidden 10000px-offset marketing span, the SVG `<title>`, the
`aria-label`, and the redundant `prosopo-logo` wrapper. Visible logo
and "Prosopo" text are unchanged.
