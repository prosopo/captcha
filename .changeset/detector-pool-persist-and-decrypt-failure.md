---
"@prosopo/provider": minor
"@prosopo/types": minor
---

feat(detector-pool): persist pushed pools, stamp releases, fix the failed-decrypt path

- `ReplaceDetectorPool` gets a dedicated 128 MB body limit (~86 MB for a
  100-bundle pool); every other route keeps the 1 MB backstop.
- A pushed pool is now written to the pool directory (staged + renamed) so it
  survives a restart instead of living only in process memory. The response
  reports `persisted` so an unpersisted push can be alarmed on. The provider
  containers gain a host-mounted volume for it — the pool is never baked into
  the image, which is public on Docker Hub.
- Bundles carry the release they were built from; providers skip bundles from
  another release (`PROSOPO_DETECTOR_POOL_RELEASE`). The widget carries no
  detector of its own, so nothing else tied the two together.
- Failed decryption is now its own decision (`DECRYPTION_FAILED`, 3 image
  rounds) evaluated before every other check. Previously the synthetic
  `userAgent: undefined` / `baseBotScore: 1` / `timestamp: 0` that
  `decryptPayload` substitutes made these sessions land in USER_AGENT_MISMATCH
  (6 rounds), or a 401 on sitekeys with `autoBanScoreThreshold` set.
  `timestampDecayFunction` loses its now-unreachable `decryptionFailed` arm.
