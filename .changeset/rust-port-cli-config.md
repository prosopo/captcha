---
"@prosopo/cli": patch
---

Start the Rust port of the provider's command-line entry point with its configuration: the config built from the environment (`getConfig`), the account and database variables, and the per-route rate limits, checked against 232 environments run through the TypeScript. One difference: a number JavaScript reads as infinite (an `L_RULES` value like `1e400`, or a 309-digit port or proxy count) makes the Rust refuse to start with a message naming the variable, where the TypeScript would start with an infinite value. The TypeScript is unchanged.
