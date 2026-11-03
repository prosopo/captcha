---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Add a `pass` action to the traffic filter, so a policy can act on only part of a category.

`pass` takes no decision: the IP is treated as if its category had no policy, and the site's own settings decide the captcha. It can be a category's action or an exception's. It's the least harsh action, so any other matching exception wins over it, whatever their order. Like a missing policy, a category on `pass` still owns the IP, so lower categories are not consulted.

Two examples:

- `proxy: pass` with an exception `inMarket: false → challenge (puzzle)`: proxies outside the market get the puzzle, and the rest are left to the site's settings.
- `proxy: block` with an exception `mobile: true → pass`: proxies are blocked except on carrier networks, which are left to the site's settings.

Protect's traffic filter gains the same action, so both products take the same inputs.

Tests: five new cases in `checkTrafficFilter.unit.test.ts` cover `pass` as a category action, a matching exception winning over it, `pass` as an exception, losing to another matching exception regardless of order, and a lower category not being consulted.
