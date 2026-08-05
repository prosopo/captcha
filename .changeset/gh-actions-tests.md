---
"@prosopo/gh-actions": patch
---

Add unit and type tests for the GitHub Actions helper scripts, and fix the defects they exposed:

- `fetchTags` read `results`/`next` from a non-existent `data` property, so every page threw, the throw was swallowed, and it always resolved to an empty tag list. A 404, an auth failure and an empty repository are now distinguishable, and pagination is bounded.
- `enableAutoMerge` interpolated the repository name and PR number into the GraphQL document, so any repository whose name contains a hyphen was a syntax error rather than a lookup. Both are now passed as variables, and a missing PR is reported instead of read off undefined.
- `semVerLt` parsed versions differently from `isSemVer`, comparing non-numeric parts as NaN so unrelated tags sorted as equal.
- `previousDockerTag` printed nothing when there was no older tag, and only rejected a non-semver target after fetching.
- `index.ts` is now a barrel with no side effects; entrypoints are guarded so importing a script no longer runs it.
