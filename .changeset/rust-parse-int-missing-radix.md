---
"@prosopo/util": patch
"@prosopo/user-access-policy": patch
---

The Rust `parse_int` now reads a radix of 0 as JavaScript reads a missing one: hexadecimal after a `0x` prefix, decimal otherwise. The Rust user-access-policy rate limits use it, because the TypeScript reads `PROSOPO_USER_ACCESS_POLICY_RULE_*` variables with `Number.parseInt` and no radix, so `0x10` means 16 there and the Rust port had been falling back to the default. The TypeScript is unchanged.
