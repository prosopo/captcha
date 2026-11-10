---
"@prosopo/user-access-policy": patch
"@prosopo/provider": patch
---

`findRules` takes its `matchingFieldsOnly` and `skipEmptyUserScopes` flags as one options object instead of two positional booleans. The internal Redis aggregation helpers take one object argument.
