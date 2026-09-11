---
"@prosopo/provider": patch
"@prosopo/database": patch
---

Serve a repeat caller the same detector bundle.

`/detector/assign` picked a bundle at random on every request. The provider now
records which bundle it served a caller and returns that one for a bounded
period, so a returning visitor gets a stable bundle instead of a fresh draw each
time. Any bundle performs identically, so this is not visible to users. If Redis
cannot answer, assign falls back to the previous behaviour rather than failing.

Also fixes the `assignDetectorBundle` tests, which were failing on main and had
gone unnoticed because the file was named `*.test.ts` while CI only runs
`*.unit.test.ts`. Renamed so it runs, and replaced the mock that
`clearAllMocks` was silently emptying.
