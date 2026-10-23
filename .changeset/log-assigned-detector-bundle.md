---
"@prosopo/provider": patch
---

The provider now logs `Detector bundle assigned` with the `bundleId`, its `release` and the `detectorSessionId` every time `detector/assign` hands out a bundle. Before this nothing recorded which bundle went out, so after a harvest we could only estimate how much of the pool had leaked.
