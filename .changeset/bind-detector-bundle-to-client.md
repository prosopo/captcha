---
"@prosopo/provider": patch
"@prosopo/database": patch
---

Stop one caller being able to collect the whole detector bundle pool.

`/detector/assign` used to pick a bundle at random on every request, so anyone
who kept calling it eventually received every bundle we had — in production a
single address pulled a 100-bundle pool in about 800 requests over 20 minutes,
twice.

The provider now remembers which bundle it gave an address and returns that same
bundle for the next hour, so a caller gets one bundle per provider per hour
instead of a fresh draw every time. Real users are unaffected: any bundle detects
equally well, and a returning visitor simply gets the one they already had. If
Redis cannot answer, assign falls back to the old random pick rather than
failing.

Also fixes the `assignDetectorBundle` tests, which were failing on main and had
gone unnoticed because the file was named `*.test.ts` while CI only runs
`*.unit.test.ts`. Renamed so it runs, and replaced the mock that
`clearAllMocks` was silently emptying.
