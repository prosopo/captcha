---
"@prosopo/types": patch
"@prosopo/provider": patch
---

The detector decoder can now report how many triggered-detector ids it dropped because they fall outside the detector catalogue (`outOfRangeDetectorIds` on `DetectorResult`). The provider counts them in a new `detector_out_of_range_ids_total` metric and logs a warning, so a client sending a malformed bitfield shows up instead of passing unnoticed.
