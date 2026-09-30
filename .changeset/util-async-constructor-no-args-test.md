---
"@prosopo/util": patch
---

The "constructs async with no args" test passed arguments and checked nothing, so it could not fail. It now constructs with no arguments and checks that the async constructor ran to completion and received no arguments. It fails if `anew` stops waiting for the async constructor.
