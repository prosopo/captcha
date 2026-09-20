---
"@prosopo/provider": patch
---

Decode a submission's two payloads together instead of one after the other.

A solution submission can carry both behavioural data and SIMD readings. Both are encrypted with the same detector bundle and neither depends on the other, but the pow and puzzle paths were looking that bundle up twice and then decoding one payload after the other.

That cost little when decoding happened inline. Once decoding moved to worker threads it became two serialised round trips on the submit path, and measured as a 22% latency increase on `pow/solution` and 25% on `puzzle/solution` against an identical node running the previous release — while every other route got faster and the event loop's p99 delay halved. This recovers that.

The bundle is now resolved once and both payloads decode concurrently, which is what the image path already did. A payload that cannot be read still comes back empty rather than failing the submission, and a decoder that throws no longer discards the other payload's perfectly good result along with it.
