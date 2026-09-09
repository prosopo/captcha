---
"@prosopo/provider": patch
---

Populate `abuserScore` on the IP comparison result so `ipValidationRules` can use it. The field was read when evaluating `abuseScoreExceedAction` but never set, so that rule never fired for any site. Also counts both IPs exceeding the threshold as one condition rather than two, which previously mis-counted under `requireAllConditions`.
