---
"@prosopo/config": patch
---

feat(config): gate the rollup bundle visualiser behind `PROSOPO_BUNDLE_STATS`.

The frontend bundle stats page (rollup-plugin-visualizer treemap) is now off by
default. Set `PROSOPO_BUNDLE_STATS=true` to generate the report and open it in
the browser once the bundle has been built; otherwise no report is emitted and
no browser window is opened.
