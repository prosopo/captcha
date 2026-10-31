---
"@prosopo/util": minor
---

Add `parseJson`, `stringifyJson`, `parseInteger`, `parseNumber`, `parseBigInt` and `parseDate`. Each returns a `@prosopo/result` `Result` instead of throwing or quietly producing `NaN`, an Invalid Date or a rounded number. `parseJson` keeps integers past 2^53 exact as `bigint`, and `stringifyJson` writes bigints as strings instead of throwing.
