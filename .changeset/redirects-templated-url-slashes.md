---
"@prosopo/lint": patch
---

fix/lint redirects now enforces trailing slashes on templated URLs and stops false-positiving on third-party hosts that contain "prosopo.io" in the path

- `isInternalLink` switched from substring matching to hostname matching via `new URL(url).hostname`, so URLs like `https://uk.trustpilot.com/review/prosopo.io` are correctly classified as external.
- New `extractMarkdownUrl` helper splits the parenthesised content of a markdown link `[text](url ...)` on whitespace while tracking `{{ ... }}` depth, fixing the previous `split(" ")[0]` that mangled templated URLs.
- `needsTrailingSlash` now only short-circuits when the URL **ends** in `}}`. URLs with templated middles (e.g. `{{ site.url }}/products/foo`) are audited — appending a slash to the static suffix is always safe and avoids a 301 hop that costs crawl budget.
- Extracted the inline replacement logic into a pure `buildReplacementText` helper and added 25 unit tests covering all four functions.
