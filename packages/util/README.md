# @prosopo/util

General-purpose helpers shared across Prosopo packages.

## Parsing untrusted text (`src/parse.ts`)

`JSON.parse`, `JSON.stringify`, `parseInt`, `Number()`, `BigInt()` and
`new Date()` all fail in ways that are easy to miss: they throw, or they hand
back `NaN`, an Invalid Date or a silently rounded number. The helpers below
return a [`@prosopo/result`](https://github.com/prosopo/result) `Result`
instead, with a `ParseError` (`kind`, truncated `input`, `cause`) on failure.

| Helper | Instead of | Differences |
| --- | --- | --- |
| `parseJson(text, { bigints })` | `JSON.parse` | Never throws. Integers past 2^53 stay exact as `bigint` (default), `"string"`, or the rounded `"number"`. |
| `stringifyJson(value, space?)` | `JSON.stringify` | Never throws. Bigints become decimal strings; cycles and top-level `undefined` are errors. |
| `parseInteger(input, { radix, min, max })` | `parseInt`, `Number` | Whole string must be an integer (`"12abc"` is an error, not 12); unsafe integers are errors. |
| `parseNumber(input, { min, max })` | `Number`, `parseFloat` | `""` is an error, not 0; `NaN`/`Infinity` are errors. |
| `parseBigInt(input)` | `BigInt` | Never throws; `"1.5"`, `1.5` and `""` are errors. |
| `parseDate(input)` | `new Date(x)` | Invalid dates are errors; numeric strings are epoch ms. |

Pick the failure mode at the call site:

```ts
const port = parseInteger(env.PORT, { min: 1, max: 65535 }).unwrapOr(8080); // default is fine
const body = parseJson(raw).expect("request body"); // fail loudly
const ttl = parseNumber(input);
if (!ttl.ok) logger.warn(() => ({ err: ttl.error })); // report and carry on
```

Exact big integers in `parseJson` rely on the reviver's source-text argument
(Node 21+, Chrome 114+, Firefox 135+). Without it the value is the rounded
number `JSON.parse` would give.
