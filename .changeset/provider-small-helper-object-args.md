---
"@prosopo/provider": patch
---

`checkTrafficFilter`, `buildEscalation`, `resolveRefreshLineage`, `renderPuzzleImages`, `validatePuzzleSolution`, `capDecoyCountForCoverage`, the detector bundle pool loaders and the interactive submission recorder now take one object. Several of these took runs of same-typed numbers or trailing optional values that were easy to pass in the wrong order.
